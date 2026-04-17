"""rename password to hashed_password

Revision ID: 7b84b58491a2
Revises: f633ca8f2584
Create Date: 2026-04-13 16:50:01.635465

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b84b58491a2'
down_revision: Union[str, Sequence[str], None] = 'f633ca8f2584'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('users', 'password', new_column_name='hashed_password')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('users', 'hashed_password', new_column_name='password')
