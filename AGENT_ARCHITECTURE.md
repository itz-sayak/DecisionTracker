# Decision Tracker Agent Architecture

This document provides an in-depth explanation of the agent architecture used in the Decision Tracker application.

## Overview

The Decision Tracker system uses a modular agent-based architecture to process meeting audio and extract structured insights. The primary agent is the `DecisionTrackerAgent`, which orchestrates the entire workflow from audio transcription to insight extraction.

## Agent Components

The agent system consists of the following components:

1. **Audio Transcription Module**: Uses Whisper to convert speech to text
2. **LLM Analysis Module**: Uses LLaMA 70B via Groq API to extract insights
3. **Insight Formatting Module**: Structures the raw LLM output into a usable format

## Workflow

```
MP3 Audio → Whisper Transcription → LLaMA 70B Analysis → Structured Insights
```

The workflow is managed through a series of distinct steps:

1. The user uploads an MP3 file through the frontend
2. The backend receives the file and initiates a background task
3. The `DecisionTrackerAgent` transcribes the audio using Whisper
4. The transcript is sent to LLaMA 70B via Groq API with a specialized prompt
5. The LLM extracts structured insights from the transcript
6. The insights are returned to the frontend for display

## Agent Implementation

### DecisionTrackerAgent Class

The `DecisionTrackerAgent` class is responsible for:

- Initializing the necessary models and clients
- Managing the audio transcription process
- Communicating with the LLaMA 70B model via Groq API
- Processing and structuring the returned insights

The agent uses a system prompt that instructs the LLM to identify specific elements within the meeting transcript:

```python
self.system_prompt = """
You are an AI assistant specialized in analyzing meeting transcripts to extract key decision-related insights.
Your task is to carefully analyze the transcript and extract the following information in a clear, structured format:

1. Executive Summary: A concise 2-3 sentence overview of the meeting's main focus and outcome.

2. Decision Points: List all key decisions made during the meeting, including:
   - The specific decision
   - Any deadlines or timelines associated with the decision
   - The rationale behind the decision

3. Risks/Concerns Raised: Identify any risks, concerns, or potential problems mentioned during the meeting.

4. Action Items: List all action items discussed, including:
   - The specific task
   - The person assigned to the task (infer from context if not explicitly stated)
   - Due date or timeline (infer from context if not explicitly stated)

5. Unresolved Questions: List any questions or issues that were raised but not resolved during the meeting.

Format your response as a JSON object with these five sections as keys. Be comprehensive in capturing all relevant information.
"""
```

## Prompt Engineering

The system prompt is carefully designed to:

1. **Define the agent's role** as an assistant specialized in meeting analysis
2. **Provide clear structure** for the expected output
3. **Specify extraction criteria** for each insight type
4. **Request inference** for implicit information (like task owners and due dates)
5. **Define the output format** as JSON for easy processing

## Future Agent Extensions

The agent architecture is designed to be modular and extensible. Future enhancements could include:

### Vector Database Integration

Adding a module for storing and retrieving insights using a vector database like FAISS or ChromaDB:

```python
def store_in_vector_db(self, insights: Dict[str, Any], meeting_id: str) -> None:
    """
    Store meeting insights in a vector database for future reference.
    """
    # Convert insights to embeddings
    embeddings = self.embedding_model.encode(json.dumps(insights))
    
    # Store in vector DB with metadata
    self.vector_db.add(
        embeddings=embeddings,
        documents=[json.dumps(insights)],
        metadatas=[{"meeting_id": meeting_id, "date": datetime.now().isoformat()}]
    )
```

### Multi-Agent System

Extending to a multi-agent system where specialized agents handle different aspects of the analysis:

1. **Transcription Agent**: Focuses solely on audio transcription
2. **Summary Agent**: Creates the executive summary
3. **Decision Agent**: Identifies decision points
4. **Action Item Agent**: Extracts and assigns action items
5. **Risk Analysis Agent**: Focuses on identifying potential risks
6. **Coordination Agent**: Orchestrates the other agents and combines their outputs

### Memory System

Implementing a memory system to track recurring topics and action items across multiple meetings:

```python
def check_against_memory(self, action_items: List[Dict]) -> List[Dict]:
    """
    Compare current action items against previous meetings to identify recurring tasks.
    """
    result = []
    for item in action_items:
        similar_items = self.vector_db.similarity_search(item["task"], k=5)
        is_recurring = any(
            self._calculate_similarity(item["task"], prev_item["task"]) > 0.85
            for prev_item in similar_items
        )
        
        item["is_recurring"] = is_recurring
        result.append(item)
    
    return result
```

## Conclusion

The Decision Tracker agent architecture provides a clean, modular approach to extracting meeting insights. By leveraging the strength of LLaMA 70B through the Groq API, the system can identify nuanced information from meeting transcripts and present it in a structured, actionable format.

The agent design allows for future extensions like vector database integration for long-term memory, multi-agent systems for more specialized analysis, and advanced memory systems for tracking recurring topics and action items. 