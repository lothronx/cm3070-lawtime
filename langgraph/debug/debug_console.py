#!/usr/bin/env python3
"""
Console debugging script for LawTime LangGraph agent.

Usage:
    python debug_console.py

Interactive commands:
    - test_ocr: Test OCR path with sample document
    - test_asr: Test ASR path with sample audio
    - inspect: Show graph structure
    - state: Show current state
    - help: Show this help
    - exit: Exit the console
"""

import os
import sys
import json
import pprint
import asyncio
from typing import Dict, Any

from dotenv import load_dotenv
from agent.graph import graph
from agent.utils.state import AgentState

# Load environment variables
load_dotenv()

class GraphDebugger:
    """Interactive debugger for the LangGraph agent."""
    
    def __init__(self):
        self.graph = graph
        self.last_state = None
        self.pp = pprint.PrettyPrinter(indent=2, width=80)
        
    def show_help(self):
        """Show available commands."""
        print("""
🔧 LawTime Graph Debugger Commands:

📊 inspect        - Show graph structure and nodes
🔍 test_ocr      - Test OCR workflow with sample data
🎤 test_asr      - Test ASR workflow with sample data  
📝 state         - Show last execution state
🆘 help          - Show this help
❌ exit          - Exit the debugger

💡 Tips:
- Use 'inspect' first to understand the graph structure
- Test with sample data using test_ocr/test_asr
- Check 'state' after each run to see intermediate results
        """)

    def inspect_graph(self):
        """Show graph structure."""
        print("📊 Graph Structure:")
        print(f"  Total nodes: {len(self.graph.nodes)}")
        print(f"  Node names: {list(self.graph.nodes.keys())}")
        print(f"  Compiled: ✅")
        
        # Show node connections
        print("\n🔗 Node Connections:")
        for node_name in self.graph.nodes.keys():
            print(f"  • {node_name}")

    def create_sample_ocr_state(self) -> AgentState:
        """Create sample state for OCR testing."""
        return {
            "source_type": "ocr",
            "source_file_urls": [
                "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/summon1.png"
            ],
            "client_list": [
                {"id": 101, "client_name": "Zhang Wei"},
                {"id": 102, "client_name": "ACME Corporation"},
                {"id": 103, "client_name": "Legal Services Ltd"}
            ],
            "raw_text": "",
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
            "extracted_events": [],
            "proposed_tasks": []
        }

    def create_sample_asr_state(self) -> AgentState:
        """Create sample state for ASR testing."""
        return {
            "source_type": "asr",
            "source_file_urls": [
                "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/audio1.m4a"
            ],
            "client_list": [
                {"id": 101, "client_name": "Zhang Wei"},
                {"id": 102, "client_name": "ACME Corporation"}
            ],
            "raw_text": "",
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
            "extracted_events": [],
            "proposed_tasks": []
        }

    async def test_ocr_workflow(self):
        """Test the OCR workflow with sample data."""
        print("🔍 Testing OCR Workflow...")
        
        try:
            initial_state = self.create_sample_ocr_state()
            print("📥 Initial State:")
            self.pp.pprint(initial_state)
            
            print("\n🚀 Executing graph...")
            result = await self.graph.ainvoke(initial_state)
            
            self.last_state = result
            print("✅ Execution completed!")
            
            print("\n📤 Final State:")
            self.pp.pprint(result)
            
            # Show key results
            if result.get("proposed_tasks"):
                print(f"\n🎯 Extracted {len(result['proposed_tasks'])} tasks:")
                for i, task in enumerate(result["proposed_tasks"], 1):
                    print(f"  {i}. {task.get('title', 'No title')}")
            
        except Exception as e:
            print(f"❌ Error during OCR workflow: {e}")
            import traceback
            traceback.print_exc()

    async def test_asr_workflow(self):
        """Test the ASR workflow with sample data."""
        print("🎤 Testing ASR Workflow...")
        
        try:
            initial_state = self.create_sample_asr_state()
            print("📥 Initial State:")
            self.pp.pprint(initial_state)
            
            print("\n🚀 Executing graph...")
            result = await self.graph.ainvoke(initial_state)
            
            self.last_state = result
            print("✅ Execution completed!")
            
            print("\n📤 Final State:")
            self.pp.pprint(result)
            
            # Show key results
            if result.get("proposed_tasks"):
                print(f"\n🎯 Extracted {len(result['proposed_tasks'])} tasks:")
                for i, task in enumerate(result["proposed_tasks"], 1):
                    print(f"  {i}. {task.get('title', 'No title')}")
            
        except Exception as e:
            print(f"❌ Error during ASR workflow: {e}")
            import traceback
            traceback.print_exc()

    def show_state(self):
        """Show the last execution state."""
        if self.last_state is None:
            print("❌ No previous execution state. Run test_ocr or test_asr first.")
            return
            
        print("📝 Last Execution State:")
        self.pp.pprint(self.last_state)

    async def run_console(self):
        """Run the interactive console."""
        print("🚀 LawTime Graph Debugger Started!")
        print("Type 'help' for commands or 'exit' to quit.\n")
        
        while True:
            try:
                command = input("🔧 > ").strip().lower()
                
                if command in ['exit', 'quit', 'q']:
                    print("👋 Goodbye!")
                    break
                elif command in ['help', 'h']:
                    self.show_help()
                elif command == 'inspect':
                    self.inspect_graph()
                elif command == 'test_ocr':
                    await self.test_ocr_workflow()
                elif command == 'test_asr':
                    await self.test_asr_workflow()
                elif command == 'state':
                    self.show_state()
                elif command == '':
                    continue
                else:
                    print(f"❌ Unknown command: '{command}'. Type 'help' for available commands.")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

async def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        # Non-interactive mode for specific commands
        debugger = GraphDebugger()
        command = sys.argv[1].lower()
        
        if command == 'inspect':
            debugger.inspect_graph()
        elif command == 'test_ocr':
            await debugger.test_ocr_workflow()
        elif command == 'test_asr':
            await debugger.test_asr_workflow()
        else:
            print(f"❌ Unknown command: {command}")
            print("Available: inspect, test_ocr, test_asr")
            sys.exit(1)
    else:
        # Interactive mode
        debugger = GraphDebugger()
        await debugger.run_console()

if __name__ == "__main__":
    asyncio.run(main())