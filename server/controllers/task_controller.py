"""Task controller for handling AI-powered task proposal requests.

This controller handles the /api/tasks/propose endpoint, validating requests,
orchestrating the LangGraph agent processing, and returning formatted responses.
"""

import logging
import json
from typing import Tuple
from flask import request, jsonify
import asyncio

from services.task_service import TaskService

logger = logging.getLogger(__name__)


class TaskController:
    """Controller for task-related endpoints."""

    def __init__(self, task_service: TaskService):
        """Initialize the task controller.
        
        Args:
            task_service: Service for processing task proposals
        """
        self.task_service = task_service

    def propose_tasks(self) -> Tuple[dict, int]:
        """Handle POST /api/tasks/propose endpoint.
        
        Expected request format:
        {
            "source_type": "ocr" | "asr",
            "source_file_urls": ["https://..."],
            "client_list": [{"id": 102, "client_name": "ACME"}]
        }
        
        Returns:
            Tuple of (response_dict, status_code)
        """
        try:
            # Extract JWT from Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                logger.warning("Missing or invalid Authorization header")
                return jsonify({"error": "Authorization header required"}), 401

            jwt_token = auth_header.replace('Bearer ', '')

            # Parse and validate request body
            if not request.is_json:
                logger.warning("Request body is not JSON")
                return jsonify({"error": "Request body must be JSON"}), 400

            data = request.get_json()

            # ===== DEBUG: Print request JSON =====
            print("\n" + "="*50)
            print("🔵 POST /api/tasks/propose")
            print("📥 REQUEST JSON:")
            print(json.dumps(data, indent=2))
            print("🔑 JWT TOKEN (first 20 chars):", jwt_token[:20] + "...")
            print("="*50)

            # Validate required fields
            source_type = data.get('source_type')
            source_file_urls = data.get('source_file_urls')
            client_list = data.get('client_list', [])

            if not source_type:
                return jsonify({"error": "source_type is required"}), 400
            
            if not source_file_urls:
                return jsonify({"error": "source_file_urls is required"}), 400

            if not isinstance(source_file_urls, list):
                return jsonify({"error": "source_file_urls must be an array"}), 400

            if not isinstance(client_list, list):
                return jsonify({"error": "client_list must be an array"}), 400

            logger.info("Processing task proposal request: %s, %d files, %d clients", source_type, len(source_file_urls), len(client_list))

            # Process the request using the task service
            # Note: Running async function in sync context using asyncio.run()
            proposed_tasks = asyncio.run(
                self.task_service.propose_tasks(
                    source_type=source_type,
                    source_file_urls=source_file_urls,
                    client_list=client_list,
                    jwt_token=jwt_token
                )
            )

            # Return successful response
            response = {
                "success": True,
                "proposed_tasks": proposed_tasks,
                "count": len(proposed_tasks)
            }

            # ===== DEBUG: Print success response JSON =====
            print("📤 SUCCESS RESPONSE JSON:")
            print(json.dumps(response, indent=2))
            print("📊 STATUS CODE: 200")
            print("="*50 + "\n")

            logger.info("Task proposal completed successfully: %d tasks generated", len(proposed_tasks))
            return jsonify(response), 200

        except ValueError as e:
            # Handle validation errors (auth, input validation, AI processing)
            error_response = {"error": str(e)}

            # ===== DEBUG: Print error response JSON =====
            print("📤 ERROR RESPONSE JSON:")
            print(json.dumps(error_response, indent=2))
            print("📊 STATUS CODE: 400")
            print("="*50 + "\n")

            logger.warning("Task proposal validation error: %s", e)
            return jsonify(error_response), 400

        except (RuntimeError, KeyError, TypeError) as e:
            # Handle unexpected errors
            error_response = {"error": "Internal server error"}

            # ===== DEBUG: Print error response JSON =====
            print("📤 ERROR RESPONSE JSON:")
            print(json.dumps(error_response, indent=2))
            print("📊 STATUS CODE: 500")
            print("="*50 + "\n")

            logger.error("Task proposal processing failed: %s", e)
            return jsonify(error_response), 500