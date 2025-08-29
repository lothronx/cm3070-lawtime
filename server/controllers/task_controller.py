"""Task controller for handling AI-powered task proposal requests.

This controller handles the /api/tasks/propose endpoint, validating requests,
orchestrating the LangGraph agent processing, and returning formatted responses.
"""

import logging
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

            logger.info(f"Processing task proposal request: {source_type}, {len(source_file_urls)} files, {len(client_list)} clients")

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

            logger.info(f"Task proposal completed successfully: {len(proposed_tasks)} tasks generated")
            return jsonify(response), 200

        except ValueError as e:
            # Handle validation errors (auth, input validation, AI processing)
            logger.warning(f"Task proposal validation error: {e}")
            return jsonify({"error": str(e)}), 400

        except Exception as e:
            # Handle unexpected errors
            logger.error(f"Task proposal processing failed: {e}")
            return jsonify({"error": "Internal server error"}), 500