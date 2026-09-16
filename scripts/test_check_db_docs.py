#!/usr/bin/env python3
"""Tests for check_db_docs.py — Python stdlib unittest only, no dependencies.

Run: python3 scripts/test_check_db_docs.py
"""

import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_db_docs  # noqa: E402

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "check_db_docs.py")

CLEAN_DOC = """# Database Setup

## Tables

- **auth.users** - Supabase auth users (automatically created)
- **public.profiles** - User profile information

## Migration Files

- `20241011000001_initial_schema.sql` - Initial database setup

## Database Schema

### profiles table

```sql
Column   | Type        | Description
---------|-------------|------------------
id       | uuid        | User ID
username | text        | Display username
verts    | integer     | Points
```
"""

CLEAN_SQL = """-- initial schema
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  verts integer default 0,
  constraint weird, check (x > 1)
);

create table if not exists public.history (
  id text primary key,
  payload jsonb not null
);
"""

HISTORY_SECTION = """
### history table

```sql
Column  | Type | Description
--------|------|------------
id      | text | Row id
payload | jsonb | Payload
```
"""


def make_fixture(doc_text, sql_files):
    """Write a temp repo with DATABASE.md and supabase/migrations/*.sql."""
    root = tempfile.mkdtemp(prefix="dbdocs-test-")
    mig = os.path.join(root, "supabase", "migrations")
    os.makedirs(mig)
    with open(os.path.join(root, "DATABASE.md"), "w") as fh:
        fh.write(doc_text)
    for name, body in sql_files.items():
        with open(os.path.join(mig, name), "w") as fh:
            fh.write(body)
    return root


class ParseTests(unittest.TestCase):
    def test_parse_create_tables_columns_and_normalization(self):
        tables = check_db_docs.parse_create_tables(CLEAN_SQL)
        self.assertEqual(
            tables,
            {"public.profiles": ["id", "username", "verts"],
             "public.history": ["id", "payload"]},
        )

    def test_parse_create_tables_quoted_and_schemad_names(self):
        sql = 'CREATE TABLE "App Items" (id text);\nCREATE TABLE auth.extra (id text);'
        tables = check_db_docs.parse_create_tables(sql)
        self.assertIn("public.app items", tables)
        self.assertIn("auth.extra", tables)

    def test_commented_create_table_is_ignored(self):
        sql = "-- CREATE TABLE public.ghost (id text);\n/* CREATE TABLE public.ghost2 (id text); */\n"
        self.assertEqual(check_db_docs.parse_create_tables(sql), {})

    def test_check_constraint_with_commas_and_parens(self):
        sql = ("CREATE TABLE t (status text CHECK (status IN "
               "('a,b (x)', 'c')), note text);")
        tables = check_db_docs.parse_create_tables(sql)
        self.assertEqual(tables["public.t"], ["status", "note"])

    def test_parse_doc_sections(self):
        migrations, tables = check_db_docs.parse_doc(CLEAN_DOC)
        self.assertEqual(migrations, ["20241011000001_initial_schema.sql"])
        self.assertEqual(tables, {"public.profiles": ["id", "username", "verts"]})


class CompareTests(unittest.TestCase):
    def setUp(self):
        self.doc_m = ["20241011000001_initial_schema.sql"]
        self.doc_t = {"public.profiles": ["id", "username"],
                      "auth.users": ["id"]}
        self.sql_f = ["20241011000001_initial_schema.sql"]
        self.sql_t = {"public.profiles": ["id", "username"]}

    def test_clean(self):
        self.assertEqual(
            check_db_docs.compare(self.doc_m, self.doc_t, self.sql_f, self.sql_t),
            [],
        )

    def test_auth_doc_only_is_not_stale(self):
        self.assertEqual(
            check_db_docs.compare(self.doc_m, self.doc_t, self.sql_f, self.sql_t),
            [],
        )  # auth.users documented but absent from SQL: exempt

    def test_undocumented_table(self):
        drift = check_db_docs.compare(
            self.doc_m, self.doc_t, self.sql_f,
            dict(self.sql_t, **{"public.actor_events": ["id"]}),
        )
        self.assertTrue(any(d.startswith("TABLE_UNDOCUMENTED: public.actor_events")
                            for d in drift))

    def test_stale_table(self):
        drift = check_db_docs.compare(
            self.doc_m, dict(self.doc_t, **{"public.ghost": ["id"]}),
            self.sql_f, self.sql_t,
        )
        self.assertTrue(any(d.startswith("TABLE_STALE: public.ghost")
                            for d in drift))

    def test_column_drift_both_directions(self):
        drift = check_db_docs.compare(
            self.doc_m, {"public.profiles": ["id", "username", "stale_col"]},
            self.sql_f, {"public.profiles": ["id", "username", "new_col"]},
        )
        self.assertTrue(any("TABLE_COLUMN_MISSING_IN_DOC: public.profiles.new_col"
                            in d for d in drift))
        self.assertTrue(any("TABLE_COLUMN_STALE_IN_DOC: public.profiles.stale_col"
                            in d for d in drift))

    def test_migration_file_drift_both_directions(self):
        drift = check_db_docs.compare(
            self.doc_m + ["9999_missing.sql"], self.doc_t,
            self.sql_f + ["0000_extra.sql"], self.sql_t,
        )
        self.assertTrue(any(d.startswith("MIGRATION_FILE_UNDOCUMENTED: 0000_extra.sql")
                            for d in drift))
        self.assertTrue(any(d.startswith("MIGRATION_FILE_MISSING: 9999_missing.sql")
                            for d in drift))


class CliExitCodeTests(unittest.TestCase):
    def run_cli(self, root):
        proc = subprocess.run(
            [sys.executable, SCRIPT, root],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        return proc.returncode, proc.stdout

    def test_clean_fixture_exit_0(self):
        doc = CLEAN_DOC + HISTORY_SECTION
        root = make_fixture(
            doc, {"20241011000001_initial_schema.sql": CLEAN_SQL})
        code, out = self.run_cli(root)
        self.assertEqual(code, 0, out)
        self.assertIn("consistent", out)

    def test_drift_fixture_exit_1(self):
        root = make_fixture(
            CLEAN_DOC, {"20241011000001_initial_schema.sql": CLEAN_SQL})
        code, out = self.run_cli(root)
        self.assertEqual(code, 1, out)
        self.assertIn("TABLE_UNDOCUMENTED: public.history", out)

    def test_missing_database_md_exit_2(self):
        root = tempfile.mkdtemp(prefix="dbdocs-test-")
        code, _ = self.run_cli(root)
        self.assertEqual(code, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
