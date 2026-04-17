"""add server default to transactions.created_at

Revision ID: d2e3f4a5b6c7
Revises: c1a2b3d4e5f6
Branch Labels: None
Depends On: None

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, Sequence[str], None] = '50d43cb95f92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'transactions',
        'created_at',
        server_default=sa.text('now()'),
        existing_type=sa.DateTime(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'transactions',
        'created_at',
        server_default=None,
        existing_type=sa.DateTime(),
        existing_nullable=False,
    )
