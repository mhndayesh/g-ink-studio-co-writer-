"""Hot-path indexes for the AI context, approve, meter, and reader queries.

Every polish/extract/approve/usage call was doing sequential scans on columns
that only had a leading `story_id` index (or none at all). These composite /
FK indexes match the actual predicates:

- chapters(story_id, number)        -> ordered chapter reads
- scene_cards(story_id, chapter_id, ordinal) -> scene assembly
- revelations(story_id, created_at) -> recent-revelation window
- llm_runs(user_id, key_source, created_at) -> per-period usage COUNT/SUM
- events(chapter_id), scene links, character relations/masks/states, etc.

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-10
"""
from __future__ import annotations

from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


# (index_name, table, [columns])
_INDEXES: list[tuple[str, str, list[str]]] = [
    ("ix_character_relationships_source", "character_relationships", ["source_id"]),
    ("ix_character_relationships_target", "character_relationships", ["target_id"]),
    ("ix_chapters_story_number", "chapters", ["story_id", "number"]),
    ("ix_events_chapter", "events", ["chapter_id"]),
    ("ix_scene_cards_story_chapter_ordinal", "scene_cards", ["story_id", "chapter_id", "ordinal"]),
    ("ix_revelations_story_created", "revelations", ["story_id", "created_at"]),
    ("ix_thread_scene_links_thread", "plot_thread_scene_links", ["thread_id"]),
    ("ix_thread_scene_links_scene", "plot_thread_scene_links", ["scene_id"]),
    ("ix_voice_profiles_character", "character_voice_profiles", ["character_id"]),
    ("ix_character_identities_character", "character_identities", ["character_id"]),
    ("ix_relationship_masks_character", "relationship_masks", ["character_id"]),
    ("ix_relationship_masks_audience", "relationship_masks", ["audience_character_id"]),
    ("ix_character_states_character", "character_states", ["character_id"]),
    ("ix_character_states_chapter", "character_states", ["chapter_id"]),
    ("ix_place_identities_location", "place_identities", ["location_id"]),
    ("ix_chapter_scripts_chapter", "chapter_scripts", ["chapter_id"]),
    ("ix_llm_runs_user_keysource_created", "llm_runs", ["user_id", "key_source", "created_at"]),
    ("ix_flow_drafts_story_approved", "flow_drafts", ["story_id", "approved_at"]),
]


def upgrade() -> None:
    for name, table, columns in _INDEXES:
        op.create_index(name, table, columns)


def downgrade() -> None:
    for name, table, _columns in reversed(_INDEXES):
        op.drop_index(name, table_name=table)
