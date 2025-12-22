"""
LLM provider abstraction.

Goal: allow graceful failover (Anthropic -> OpenAI) without touching all call sites.
"""


