"""Task processing service for LawTime AI agent integration.

This service handles the integration between Flask HTTP handlers and the LangGraph
agent workflow. It converts HTTP request data into AgentState format, invokes
the graph, and returns the processed results.
"""

import logging
from datetime import datetime
from typing import Dict, List, Any
from supabase import Client

from agent.graph import graph
from agent.utils.state import AgentState
from config import Config

logger = logging.getLogger(__name__)


class TaskService:
    """Service for processing task proposals using the LangGraph agent."""

    def __init__(self, supabase_client: Client, config: Config):
        """Initialize the task service.

        Args:
            supabase_client: Supabase client for JWT validation
            config: Application configuration
        """
        self.supabase = supabase_client
        self.config = config

    def validate_jwt_and_extract_user_id(self, jwt_token: str) -> str:
        """Validate JWT token and extract user ID.

        Args:
            jwt_token: JWT token from request header

        Returns:
            User ID string

        Raises:
            ValueError: If token is invalid or expired
        """
        try:
            # Validate JWT using Supabase
            user = self.supabase.auth.get_user(jwt_token)
            if not user or not user.user:
                raise ValueError("Invalid or expired JWT token")

            return user.user.id
        except Exception as e:
            logger.error(f"JWT validation failed: {e}")
            raise ValueError("Authentication failed")

    def validate_file_urls(self, file_urls: List[str], user_id: str) -> None:
        """Validate that file URLs belong to the authenticated user.

        Args:
            file_urls: List of file URLs to validate
            user_id: Authenticated user ID

        Raises:
            ValueError: If any URL doesn't belong to the user
        """
        for url in file_urls:
            if not self._url_belongs_to_user(url, user_id):
                raise ValueError(f"Unauthorized access to file: {url}")

    def _url_belongs_to_user(self, file_url: str, user_id: str) -> bool:
        """Check if a file URL belongs to the authenticated user.

        Args:
            file_url: File URL to check
            user_id: User ID to verify against

        Returns:
            True if URL belongs to user, False otherwise
        """
        # Extract user ID from temp_uploads URL pattern:
        # ....../project/default/storage/buckets/file_storage/temp/{user_id}/{batch_id}/{filename}
        try:
            url_parts = file_url.split("/")
            temp_uploads_index = url_parts.index("temp")
            url_user_id = url_parts[temp_uploads_index + 1]
            return url_user_id == user_id
        except (ValueError, IndexError):
            logger.warning(f"Could not parse user ID from URL: {file_url}")
            return False

    async def propose_tasks(
        self,
        source_type: str,
        source_file_urls: List[str],
        client_list: List[Dict[str, Any]],
        jwt_token: str,
    ) -> List[Dict[str, Any]]:
        """Process files using LangGraph agent and return proposed tasks.

        This service handles HTTP-layer concerns (authentication, file ownership)
        and delegates all AI workflow logic to the LangGraph agent.

        Args:
            source_type: Either 'ocr' or 'asr'
            source_file_urls: List of file URLs to process
            client_list: List of existing clients for context
            jwt_token: JWT token for authentication

        Returns:
            List of proposed tasks

        Raises:
            ValueError: If inputs are invalid or authentication fails
        """
        # Validate authentication
        user_id = self.validate_jwt_and_extract_user_id(jwt_token)
        logger.info(f"Processing task proposal for user {user_id}")

        # Validate file URL ownership (HTTP-layer concern)
        self.validate_file_urls(source_file_urls, user_id)

        # Create minimal initial state - let initialize_agent_state handle validation and setup
        initial_state: AgentState = {
            "source_type": source_type,
            "source_file_urls": source_file_urls,
            "client_list": client_list,
            # All other fields will be initialized by initialize_agent_state node
            "client_list_formatted": "",
            "current_datetime": "",
            "dashscope_api_key": "",
            "raw_text": "",
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
            "extracted_events": [],
            "proposed_tasks": [],
        }

        try:
            # Invoke the LangGraph agent - it will handle all validation and initialization
            logger.info(f"Invoking LangGraph agent with source_type: {source_type}")
            final_state = graph.invoke(initial_state)

            # Extract proposed tasks from final state
            proposed_tasks = final_state.get("proposed_tasks", [])

            if not proposed_tasks:
                logger.warning("Agent returned no proposed tasks")
                return []

            logger.info(
                f"Agent processing completed successfully. Generated {len(proposed_tasks)} tasks"
            )
            return proposed_tasks

        except Exception as e:
            logger.error(f"LangGraph agent processing failed: {e}")
            raise ValueError(f"AI processing failed: {str(e)}")
