"""add person4

Revision ID: 9ad785997391
Revises: d8e1c7125f95
Create Date: 2026-05-03 21:20:40.831135

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ad785997391'
down_revision: Union[str, Sequence[str], None] = 'd8e1c7125f95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
