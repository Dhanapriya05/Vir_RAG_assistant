"""
Tool Caller — Groq MCP-style agentic tool-calling loop.
"""

import json

from config import get_groq_client
from services.map_tools import TOOL_DEFINITIONS, execute_tool

def get_client():
    return get_groq_client()

MAX_TOOL_ROUNDS = 5

FALLBACK_TOOL_MODELS = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
]


def generate_with_tools(system_prompt: str, user_message: str, history: list = None) -> str:
    """
    Run the Groq tool-calling loop with multi-model fallback.
    """
    client = get_client()
    if not client:
        return "Campus navigation service is currently initializing. Please try again in a moment."

    if history is None:
        history = []

    base_messages = [{"role": "system", "content": system_prompt}]

    for msg in history[-6:]:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            base_messages.append({"role": msg["role"], "content": msg["content"]})

    base_messages.append({"role": "user", "content": user_message})

    for model_name in FALLBACK_TOOL_MODELS:
        messages = list(base_messages)
        try:
            for round_num in range(MAX_TOOL_ROUNDS):
                print(f"\n[ToolCaller] Round {round_num + 1} -- sending {len(messages)} messages (model: {model_name})")

                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    tools=TOOL_DEFINITIONS,
                    tool_choice="auto",
                    temperature=0.2,
                )

                choice = response.choices[0]
                message = choice.message

                if not message.tool_calls:
                    print("[ToolCaller] No tool calls -- returning final answer.")
                    return message.content or ""

                print(f"[ToolCaller] {len(message.tool_calls)} tool call(s) requested:")
                for tc in message.tool_calls:
                    print(f"  -> {tc.function.name}({tc.function.arguments})")

                messages.append({
                    "role": "assistant",
                    "content": message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ],
                })

                for tc in message.tool_calls:
                    tool_result = execute_tool(tc.function.name, tc.function.arguments)
                    print(f"[ToolCaller] Result for {tc.function.name}:\n{tool_result}\n")
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": tool_result,
                    })

            return "I was unable to complete navigation after multiple attempts. Please try rephrasing your question."
        except Exception as e:
            print(f"[ToolCaller] Model {model_name} error: {e}. Trying fallback...")
            continue

    return "Navigation assistance is temporarily unavailable. Please try again in a few moments."
