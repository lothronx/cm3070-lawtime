import os
from dotenv import load_dotenv

from flask import Flask, jsonify
from supabase import create_client, Client

# Load environment variables from .env.local file
load_dotenv(".env.local")


def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)

    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    supabase: Client = create_client(url, key)

    # a simple page that says hello
    @app.route("/")
    def hello():
        try:
            response = supabase.table("tasks").select("*").execute()
            return jsonify(
                {"status": "success", "data": response.data, "count": response.count}
            )
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    return app
