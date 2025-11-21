import os
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
import re
from collections import Counter


try:
    from bertopic import BERTopic
    BERTOPIC_AVAILABLE = True
except ImportError:
    BERTOPIC_AVAILABLE = False
    print("Warning: BERTopic not installed. Topic generation will not be available.")


load_dotenv()


MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "neurodoc")
CSV_PATH = os.getenv("CSV_PATH", r"r:\NeuroDoc\1k_stories_100_genre.csv")


app = FastAPI(title="NeuroDoc API", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


client = None
db = None


topic_model = None


def extract_keywords(text, num_keywords=5):
    text = re.sub(r'[^a-zA-Z\s]', '', text.lower())

    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 
                  'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 
                  'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 
                  'those', 'it', 'its', 'they', 'them', 'their', 'he', 'she', 'him', 
                  'her', 'his', 'i', 'you', 'we', 'us', 'my', 'your', 'our'}
    
    
    words = [word for word in text.split() if word not in stop_words and len(word) > 3]
    word_freq = Counter(words)
        
    return [word for word, _ in word_freq.most_common(num_keywords)]

def find_or_create_topic(keywords, existing_topics):
    for topic in existing_topics:
        topic_keywords = set(topic.get('keywords', []))
        if any(kw in topic_keywords for kw in keywords):
            return topic['topic_id'], topic['keywords'][:3]
    
    return None, keywords[:3]

async def generate_simple_topics_if_needed():
    try:
        topic_count = await db.topics.count_documents({})
        if topic_count > 0:
            print(f"Topics already exist: {topic_count} topics")
            return
        
        print("Generating simple keyword-based topics from documents...")
        documents = await db.documents.find().to_list(length=None)
        
        if not documents:
            print("No documents found to generate topics from")
            return
        
        
        all_keywords = []
        for doc in documents:
            content = doc.get('content', '') + ' ' + doc.get('title', '')
            keywords = extract_keywords(content, num_keywords=10)
            all_keywords.extend(keywords)
        
        
        keyword_freq = Counter(all_keywords)
        top_keywords = keyword_freq.most_common(50)
        
        
        topics_to_insert = []
        topic_id = 0
        
        for keyword, freq in top_keywords[:30]:  
            topic_doc = {
                "topic_id": topic_id,
                "name": keyword.capitalize(),
                "keywords": [keyword],
                "count": freq,
                "representative_docs": []
            }
            topics_to_insert.append(topic_doc)
            topic_id += 1
        
        if topics_to_insert:
            await db.topics.insert_many(topics_to_insert)
            print(f"Generated {len(topics_to_insert)} simple topics")
        
        
        for doc in documents:
            content = doc.get('content', '') + ' ' + doc.get('title', '')
            doc_keywords = set(extract_keywords(content, num_keywords=10))
            
            
            matching_topics = []
            for topic in topics_to_insert:
                if any(kw in doc_keywords for kw in topic['keywords']):
                    matching_topics.append(topic['topic_id'])
            
            if matching_topics:
                topic_names = [topics_to_insert[tid]['keywords'][0] for tid in matching_topics[:3]]
                await db.documents.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "topics": matching_topics[:3],
                        "topic_names": topic_names
                    }}
                )
        
        print("Updated documents with topic assignments")
        
    except Exception as e:
        print(f"Error generating simple topics: {str(e)}")


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

class TopicModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    topic_id: int
    name: str
    keywords: List[str]
    representative_docs: List[str] = []
    count: int = 0
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DocumentModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    story_id: int
    title: str
    content: str
    genre: str
    topics: List[int] = []
    topic_names: List[str] = []
    authors: List[str] = []
    year: Optional[int] = None
    doi: Optional[str] = None
    date_added: datetime = Field(default_factory=datetime.utcnow)
    popularity: int = 0
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DocumentCreateModel(BaseModel):
    title: str
    content: str
    genre: Optional[str] = "General"
    authors: List[str] = []
    year: Optional[int] = None
    doi: Optional[str] = None

class DocumentUpdateModel(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    genre: Optional[str] = None
    topics: Optional[List[int]] = None
    topic_names: Optional[List[str]] = None
    authors: Optional[List[str]] = None
    year: Optional[int] = None
    doi: Optional[str] = None

class TopicGenerationResponse(BaseModel):
    message: str
    topics_count: int
    documents_processed: int

class TopicSuggestionRequest(BaseModel):
    content: str
    num_topics: int = 5

class TopicSuggestionResponse(BaseModel):
    keywords: List[str]
    suggested_topic_ids: List[int]


@app.on_event("startup")
async def startup_db_client():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    print(f"Connected to MongoDB: {DATABASE_NAME}")
    
    
    await db.documents.create_index([("title", "text"), ("content", "text")])
    await db.documents.create_index("topics")
    await db.documents.create_index("topic_names")
    print("Database indexes created")
    
    
    await generate_simple_topics_if_needed()

@app.on_event("shutdown")
async def shutdown_db_client():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@app.get("/")
async def read_root():
    return {
        "message": "NeuroDoc API",
        "version": "1.0.0",
        "endpoints": {
            "topics": "/api/topics",
            "documents": "/api/documents",
            "search": "/api/documents/search",
            "generate_topics": "/api/topics/generate"
        }
    }

@app.post("/api/topics/generate", response_model=TopicGenerationResponse)
async def generate_topics():
    global topic_model
    
    if not BERTOPIC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="BERTopic is not installed. Please install it with: pip install bertopic"
        )
    
    try:
        
        if not os.path.exists(CSV_PATH):
            raise HTTPException(status_code=404, detail=f"CSV file not found: {CSV_PATH}")
        
        docs_df = pd.read_csv(CSV_PATH)
        
        
        topic_model = BERTopic(verbose=True, calculate_probabilities=True)
        
        
        topics, probs = topic_model.fit_transform(docs_df['story'])
        
        
        topic_info = topic_model.get_topic_info()
        
        
        await db.topics.delete_many({})
        
        
        topics_to_insert = []
        for idx, row in topic_info.iterrows():
            if row['Topic'] == -1:  
                continue
            
            topic_keywords = topic_model.get_topic(row['Topic'])
            keywords = [word for word, score in topic_keywords[:10]] if topic_keywords else []
            
            topic_doc = {
                "topic_id": int(row['Topic']),
                "name": row['Name'] if 'Name' in row else f"Topic {row['Topic']}",
                "keywords": keywords,
                "count": int(row['Count']),
                "representative_docs": []
            }
            topics_to_insert.append(topic_doc)
        
        if topics_to_insert:
            await db.topics.insert_many(topics_to_insert)
        
        
        await db.documents.delete_many({})
        
        
        documents_to_insert = []
        for idx, row in docs_df.iterrows():
            topic_id = int(topics[idx])
            topic_names = []
            
            if topic_id != -1:
                topic_keywords = topic_model.get_topic(topic_id)
                topic_names = [word for word, score in topic_keywords[:3]] if topic_keywords else []
            
            doc = {
                "story_id": int(row['id']),
                "title": row['title'],
                "content": row['story'],
                "genre": row['genre'],
                "topics": [topic_id] if topic_id != -1 else [],
                "topic_names": topic_names,
                "authors": [],
                "year": None,
                "doi": None,
                "date_added": datetime.utcnow(),
                "popularity": 0
            }
            documents_to_insert.append(doc)
        
        if documents_to_insert:
            await db.documents.insert_many(documents_to_insert)
        
        return TopicGenerationResponse(
            message="Topics generated successfully",
            topics_count=len(topics_to_insert),
            documents_processed=len(documents_to_insert)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating topics: {str(e)}")

@app.get("/api/topics")
async def get_topics(skip: int = 0, limit: int = 100):
    try:
        topics = await db.topics.find().skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(topic) for topic in topics]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching topics: {str(e)}")

@app.get("/api/topics/{topic_id}")
async def get_topic(topic_id: int):
    try:
        topic = await db.topics.find_one({"topic_id": topic_id})
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        return serialize_doc(topic)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching topic: {str(e)}")

@app.post("/api/documents", response_model=dict)
async def create_document(document: DocumentCreateModel):
    try:
        doc_dict = document.dict()
        doc_dict["date_added"] = datetime.utcnow()
        doc_dict["popularity"] = 0
        doc_dict["story_id"] = 0  
        
        
        content_text = doc_dict["content"] + " " + doc_dict["title"]
        keywords = extract_keywords(content_text, num_keywords=10)
        
        
        existing_topics = await db.topics.find().to_list(length=None)
        
        
        matched_topic_ids = []
        for topic in existing_topics:
            topic_keywords = set([kw.lower() for kw in topic.get('keywords', [])])
            if any(kw.lower() in topic_keywords for kw in keywords):
                matched_topic_ids.append(topic['topic_id'])
                if len(matched_topic_ids) >= 3:  
                    break
        
        
        doc_dict["topics"] = matched_topic_ids[:3]
        doc_dict["topic_names"] = keywords[:5]  
        
        
        result = await db.documents.insert_one(doc_dict)
        doc_dict["_id"] = str(result.inserted_id)
        return serialize_doc(doc_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating document: {str(e)}")

@app.get("/api/documents")
async def get_documents(
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "date_added",
    order: str = "desc"
):
    try:
        sort_order = -1 if order == "desc" else 1
        documents = await db.documents.find().sort(sort_by, sort_order).skip(skip).limit(limit).to_list(length=limit)
        total = await db.documents.count_documents({})
        
        return {
            "documents": [serialize_doc(doc) for doc in documents],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")

@app.get("/api/documents/{doc_id}")
async def get_document(doc_id: str):
    try:
        if not ObjectId.is_valid(doc_id):
            raise HTTPException(status_code=400, detail="Invalid document ID")
        
        document = await db.documents.find_one({"_id": ObjectId(doc_id)})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return serialize_doc(document)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching document: {str(e)}")

@app.put("/api/documents/{doc_id}")
async def update_document(doc_id: str, document: DocumentUpdateModel):
    try:
        if not ObjectId.is_valid(doc_id):
            raise HTTPException(status_code=400, detail="Invalid document ID")
        
        update_data = {k: v for k, v in document.dict().items() if v is not None}
        
        
        if "topics" in update_data:
            topic_names = []
            for topic_id in update_data["topics"]:
                topic = await db.topics.find_one({"topic_id": topic_id})
                if topic:
                    topic_names.extend(topic.get("keywords", [])[:3])
            update_data["topic_names"] = topic_names
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = await db.documents.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        updated_doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
        return serialize_doc(updated_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating document: {str(e)}")

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    try:
        if not ObjectId.is_valid(doc_id):
            raise HTTPException(status_code=400, detail="Invalid document ID")
        
        result = await db.documents.delete_one({"_id": ObjectId(doc_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"message": "Document deleted successfully", "id": doc_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@app.get("/api/documents/search")
async def search_documents(
    q: str = Query(..., min_length=1),
    skip: int = 0,
    limit: int = 50
):
    try:
        
        documents = []
        
        
        try:
            documents = await db.documents.find(
                {"$text": {"$search": q}},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit).to_list(length=limit)
        except:
            pass
        
        
        if not documents:
            regex_query = {
                "$or": [
                    {"title": {"$regex": q, "$options": "i"}},
                    {"content": {"$regex": q, "$options": "i"}},
                    {"genre": {"$regex": q, "$options": "i"}},
                    {"topic_names": {"$regex": q, "$options": "i"}}
                ]
            }
            documents = await db.documents.find(regex_query).skip(skip).limit(limit).to_list(length=limit)
        
        return {
            "documents": [serialize_doc(doc) for doc in documents],
            "query": q,
            "count": len(documents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")

@app.get("/api/documents/filter/topic/{topic_id}")
async def filter_documents_by_topic(
    topic_id: int,
    skip: int = 0,
    limit: int = 50
):
    try:
        documents = await db.documents.find(
            {"topics": topic_id}
        ).skip(skip).limit(limit).to_list(length=limit)
        
        total = await db.documents.count_documents({"topics": topic_id})
        
        return {
            "documents": [serialize_doc(doc) for doc in documents],
            "topic_id": topic_id,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filtering documents: {str(e)}")

@app.get("/api/csv/load")
async def load_csv_data():
    try:
        if not os.path.exists(CSV_PATH):
            raise HTTPException(status_code=404, detail=f"CSV file not found: {CSV_PATH}")
        
        docs_df = pd.read_csv(CSV_PATH)
        
        
        await db.documents.delete_many({})
        
        
        documents_to_insert = []
        for idx, row in docs_df.iterrows():
            doc = {
                "story_id": int(row['id']),
                "title": row['title'],
                "content": row['story'],
                "genre": row['genre'],
                "topics": [],
                "topic_names": [],
                "authors": [],
                "year": None,
                "doi": None,
                "date_added": datetime.utcnow(),
                "popularity": 0
            }
            documents_to_insert.append(doc)
        
        if documents_to_insert:
            await db.documents.insert_many(documents_to_insert)
        
        return {
            "message": "CSV data loaded successfully",
            "documents_loaded": len(documents_to_insert)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading CSV: {str(e)}")

@app.post("/api/topics/suggest", response_model=TopicSuggestionResponse)
async def suggest_topics(request: TopicSuggestionRequest):
    try:
        
        keywords = extract_keywords(request.content, num_keywords=request.num_topics)
        
        
        existing_topics = await db.topics.find().to_list(length=None)
        
        
        suggested_topic_ids = []
        for topic in existing_topics:
            topic_keywords = set(topic.get('keywords', []))
            if any(kw in topic_keywords for kw in keywords):
                suggested_topic_ids.append(topic['topic_id'])
        
        return TopicSuggestionResponse(
            keywords=keywords,
            suggested_topic_ids=suggested_topic_ids[:5]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error suggesting topics: {str(e)}")