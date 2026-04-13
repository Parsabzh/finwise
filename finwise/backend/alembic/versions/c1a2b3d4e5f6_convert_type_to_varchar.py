"""convert transaction type column from native enum to varchar

Revision ID: c1a2b3d4e5f6
Revises: b01ffbbca8df
Branch Labels: None
Depends On: None

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b01ffbbca8df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert native PostgreSQL enum to VARCHAR.
    # The existing enum has values INCOME/EXPENSE (uppercase names); we want
    # the column to hold lowercase values (income/expense) going forward.
    op.execute("""
        ALTER TABLE transactions
            ALTER COLUMN type TYPE VARCHAR
            USING LOWER(type::text)
    """)
    op.execute("DROP TYPE IF EXISTS transactiontype")


def downgrade() -> None:
    op.execute("CREATE TYPE transactiontype AS ENUM ('INCOME', 'EXPENSE')")
    op.execute("""
        ALTER TABLE transactions
            ALTER COLUMN type TYPE transactiontype
            USING UPPER(type)::transactiontype
    """)
