"""
Tool Caller — Groq MCP-style agentic tool-calling loop.

Handles the full round-trip:
  1. Send user message + tool definitions to Groq.
  2. If Groq responds with tool_calls, execute each tool.
  3. Send tool results back to Groq as tool messages.
  4. Repeat until Groq produces a final text answer (no more tool calls).

Usage:
    from services.tool_caller import generate_with_tools
    answer = generate_with_tools(system_prompt, user_message)
"""

import json
from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL
from services.map_tools import TOOL_DEFINITIONS, execute_tool

client = Groq(api_key=GROQ_API_KEY)

# Maximum tool-calling rounds to prevent infinite loops
MAX_TOOL_ROUNDS = 5


def generate_with_tools(system_prompt: str, user_message: str, history: list = None) -> str:
    """
    Run the Groq tool-calling loop.

    Args:
        system_prompt: System instructions for the model.
        user_message:  The user's current question.
        history:       Prior conversation messages (list of role/content dicts).

    Returns:
        The final assistant text answer as a string.
    """
    if history is None:
        history = []

    # Build the initial messages list
    messages = [{"role": "system", "content": system_prompt}]

    # Include recent conversation history (last 6 turns)
    for msg in history[-6:]:
        if isinstance(msg, dict) and "role" in msg and "content" in msg:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Append the current user question
    messages.append({"role": "user", "content": user_message})

    for round_num in range(MAX_TOOL_ROUNDS):

        print(f"\n[ToolCaller] Round {round_num + 1} — sending {len(messages)} messages")

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.2,
        )

        choice = response.choices[0]
        message = choice.message

        # No tool calls → final answer reached
        if not message.tool_calls:
            print("[ToolCaller] No tool calls — returning final answer.")
            return message.content or ""

        # Log tool calls
        print(f"[ToolCaller] {len(message.tool_calls)} tool call(s) requested:")
        for tc in message.tool_calls:
            print(f"  → {tc.function.name}({tc.function.arguments})")

        # Append assistant's tool-call message to history
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

        # Execute each tool and append results as tool messages
        for tc in message.tool_calls:
            tool_result = execute_tool(tc.function.name, tc.function.arguments)

            print(f"[ToolCaller] Result for {tc.function.name}:\n{tool_result}\n")

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": tool_result,
            })

    # Safety fallback if loop exhausted
    return "I was unable to complete navigation after multiple attempts. Please try rephrasing your question."
