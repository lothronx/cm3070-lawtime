#!/usr/bin/env python3
"""
Quick test script for debugging specific issues.

Usage: python quick_test.py
"""

import asyncio
from agent.graph import graph
from agent.utils.state import AgentState

async def test_basic_flow():
    """Test basic graph flow with minimal state."""
    print("🔧 Quick Graph Test")
    
    # Test OCR path
    ocr_state = {
        "source_type": "ocr",
        "source_file_urls": ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/summon1.png"],
        "client_list": [{"id": 101, "client_name": "Test Client"}],
        "raw_text": "",
        "extracted_events": [],
        "proposed_tasks": []
    }
    
    print("\n📋 Testing OCR Path...")
    try:
        result = await graph.ainvoke(ocr_state)
        print(f"✅ OCR completed - {len(result['proposed_tasks'])} tasks extracted")
        print(f"📄 Document type: {result.get('document_type', 'None')}")
        print(f"📝 Raw text length: {len(result.get('raw_text', ''))}")
        
        if result['proposed_tasks']:
            print(f"🎯 First task: {result['proposed_tasks'][0]['title']}")
    except Exception as e:
        print(f"❌ OCR failed: {e}")
    
    # Test ASR path  
    asr_state = {
        "source_type": "asr", 
        "source_file_urls": ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/audio1.m4a"],
        "client_list": [{"id": 101, "client_name": "Test Client"}],
        "raw_text": "",
        "extracted_events": [],
        "proposed_tasks": []
    }
    
    print("\n🎤 Testing ASR Path...")
    try:
        result = await graph.ainvoke(asr_state)
        print(f"✅ ASR completed - {len(result['proposed_tasks'])} tasks extracted")
        print(f"📝 Transcribed text: {result.get('raw_text', 'None')[:50]}...")
        
        if result['proposed_tasks']:
            print(f"🎯 First task: {result['proposed_tasks'][0]['title']}")
    except Exception as e:
        print(f"❌ ASR failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_basic_flow())