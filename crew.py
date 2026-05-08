from crewai import Crew

from Agents.research_specialist import research_specialist_agent
from Agents.data_analyst import data_analyst_agent
from Agents.content_writer import content_writer_agent
from Tasks.research_task import research_task
from Tasks.analysis_task import analysis_task
from Tasks.writing_task import writing_task


research_crew = Crew(
    agents=[
        research_specialist_agent,
        data_analyst_agent,
        content_writer_agent,
    ],
    tasks=[
        research_task,
        analysis_task,
        writing_task,
    ],
    verbose=True
)