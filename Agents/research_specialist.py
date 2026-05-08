import os
from crewai import Agent,LLM
from crewai_tools  import SerperDevTool

model=os.getenv("RESEARCH_AGENT_LLM")
temperature=float(os.getenv("RESEARCH_AGENT_TEMPERATURE"))

llm=LLM(
    model=model,
    temperature=temperature
)
research_specialist_agent = Agent(
    role="Research Specialist",
    goal="Collect accurate, reliable, and well-structured information from trusted sources",
    backstory=(
        "You are a highly skilled research expert experienced in gathering, "
        "analyzing, and verifying information from multiple credible sources. "
        "You excel at identifying relevant insights, cross-checking facts, "
        "and delivering clear, up-to-date research findings efficiently."
    ),
    llm=llm,
    tools=[SerperDevTool()],
    verbose=True
)