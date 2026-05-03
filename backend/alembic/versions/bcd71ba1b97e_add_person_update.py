"""add person update

Revision ID: bcd71ba1b97e
Revises: 9ad785997391
Create Date: 2026-05-03 21:22:39.146905

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bcd71ba1b97e'
down_revision: Union[str, Sequence[str], None] = '9ad785997391'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
