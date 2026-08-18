from anthropic import Anthropic
import openai
import google.generativeai as genai
from ..config import settings

class LLMClient:
    def __init__(self):
        # We'll use Gemini as primary if available
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            self.provider = "gemini"
        elif settings.anthropic_api_key:
            self.anthropic = Anthropic(api_key=settings.anthropic_api_key)
            self.provider = "anthropic"
        elif settings.openai_api_key:
            openai.api_key = settings.openai_api_key
            self.provider = "openai"
        else:
            # Fallback for testing when no keys are available
            self.provider = "mock"

    async def generate_proposal(self, requirements: str) -> str:
        prompt = f"Write a detailed business proposal based on the following requirements:\n\n{requirements}"
        return await self._generate(prompt)
        
    async def audit_website(self, scraped_data: dict) -> dict:
        prompt = f"Audit the following website data and return a JSON object with 'score' (0-100), 'findings' (dict), and 'recommendations' (list of dicts with 'title' and 'priority'). Data:\n\n{scraped_data}"
        response = await self._generate(prompt)
        import json
        import re
        try:
            # Extract JSON from potential markdown block
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(response)
        except:
            return {"score": 50, "findings": {"info": "failed to parse"}, "recommendations": []}

    async def write_email(self, context: str, tone: str) -> dict:
        prompt = f"Write an email based on this context:\n{context}\n\nTone: {tone}\n\nReturn JSON with 'subject' and 'body' fields."
        response = await self._generate(prompt)
        import json
        import re
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(response)
        except:
            return {"subject": "Email Subject", "body": response}

    async def summarize_meeting(self, transcript: str) -> dict:
        prompt = f"Summarize the following meeting transcript. Return JSON with 'summary' (string) and 'actionItems' (list of dicts with 'task', 'assignee', 'dueDate').\n\nTranscript:\n{transcript}"
        response = await self._generate(prompt)
        import json
        import re
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(response)
        except:
            return {"summary": response, "actionItems": []}

    async def chat(self, message: str, history: list = None) -> str:
        prompt = f"Chat history: {history}\n\nUser: {message}\nAgent:"
        return await self._generate(prompt)

    async def _generate(self, prompt: str) -> str:
        if self.provider == "gemini":
            response = self.gemini_model.generate_content(prompt)
            return response.text
        elif self.provider == "anthropic":
            response = self.anthropic.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        elif self.provider == "openai":
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message['content']
        else:
            return f"Mock response for prompt: {prompt[:50]}..."

llm_client = LLMClient()
