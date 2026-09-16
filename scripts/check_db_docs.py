#!/usr/bin/env python3
"""Consistency checker: DATABASE.md documented schema vs supabase/migrations SQL.

Dependency-free (Python 3 stdlib only; no node_modules, no pip).

Contract:
  - Enumerates tables/columns from BOTH sides:
      doc side:  DATABASE.md "### <table> table" schema sections (pipe tables)
                 and the "## ... Migration Files" bullet list.
      sql side:  supabase/migrations/*.sql CREATE TABLE statements
                 (line comments stripped; quote/paren-aware body splitting).
  - Reports drift classes:
      MIGRATION_FILE_UNDOCUMENTED   file on disk, not listed in DATABASE.md
      MIGRATION_FILE_MISSING        listed in DATABASE.md, absent on disk
      TABLE_UNDOCUMENTED            created in SQL, no DATABASE.md schema section
      TABLE_STALE                   documented, never created in SQL
      TABLE_COLUMN_MISSING_IN_DOC   column in SQL, absent from doc section
      TABLE_COLUMN_STALE_IN_DOC     column documented, absent from SQL
  - Tables in the `auth` schema are Supabase-managed (per DATABASE.md) and are
    exempt from TABLE_STALE: repo migrations legitimately never create them.
  - Exit codes: 0 = consistent, 1 = drift found, 2 = usage/parse error.

Usage: python3 scripts/check_db_docs.py [repo_root]
"""

import os
import re
import sys

DEFAULT_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TABLE_CONSTRAINT_STARTERS = {
    "PRIMARY", "FOREIGN", "UNIQUE", "CONSTRAINT", "CHECK", "EXCLUDE", "LIKE",
}


def strip_sql_comments(sql):
    """Remove -- line comments, respecting single-quoted strings and $$ blocks."""
    out = []
    i, n = 0, len(sql)
    while i < n:
        ch = sql[i]
        if ch == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            out.append(sql[i:j + 1])
            i = j + 1
        elif sql[i:i + 2] == "$$":
            end = sql.find("$$", i + 2)
            end = n if end == -1 else end + 2
            i = end  # drop function bodies (no schema tables declared there)
        elif sql[i:i + 2] == "--":
            end = sql.find("\n", i)
            end = n if end == -1 else end
            i = end  # drop the comment
        elif ch == "/" and sql[i + 1:i + 2] == "*":
            end = sql.find("*/", i + 2)
            end = n if end == -1 else end + 2
            i = end  # drop the comment
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def split_top_level(body):
    """Split a parenthesized SQL body on top-level commas (quote/paren aware)."""
    parts, depth, buf, i, n = [], 0, [], 0, len(body)
    while i < n:
        ch = body[i]
        if ch == "'":
            j = i + 1
            while j < n:
                if body[j] == "'":
                    if j + 1 < n and body[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            buf.append(body[i:j + 1])
            i = j + 1
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    if "".join(buf).strip():
        parts.append("".join(buf))
    return [p.strip() for p in parts if p.strip()]


def normalize_table_name(raw):
    parts = [p.strip().strip('"') for p in raw.strip().split(".")]
    name = ".".join(parts)
    if "." not in name:
        name = "public." + name
    return name.lower()


_IDENT = r'(?:"[^"]+"|[A-Za-z_][\w$]*)'
_CREATE_TABLE_RE = re.compile(
    r"create\s+table\s+(?:if\s+not\s+exists\s+)?((?:%s)(?:\.(?:%s))?)\s*\("
    % (_IDENT, _IDENT),
    re.IGNORECASE,
)


def parse_create_tables(sql_text):
    """Return {normalized_table: [column names]} from CREATE TABLE statements."""
    tables = {}
    clean = strip_sql_comments(sql_text)
    for m in _CREATE_TABLE_RE.finditer(clean):
        name = normalize_table_name(m.group(1))
        # Find the matching close paren for this CREATE TABLE body.
        depth, i = 1, m.end()
        while i < len(clean) and depth > 0:
            ch = clean[i]
            if ch == "'":
                j = i + 1
                while j < len(clean):
                    if clean[j] == "'":
                        if j + 1 < len(clean) and clean[j + 1] == "'":
                            j += 2
                            continue
                        break
                    j += 1
                i = j + 1
                continue
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        body = clean[m.end():i]
        columns = []
        for part in split_top_level(body):
            first = part.split()[0].strip().strip('"')
            if first.upper() in TABLE_CONSTRAINT_STARTERS:
                continue
            columns.append(first.lower())
        tables[name] = columns
    return tables


def parse_doc(doc_text):
    """Return (migration_files, {table: [columns]}) from DATABASE.md content."""
    lines = doc_text.splitlines()
    migration_files = []
    in_migration_section = False
    for line in lines:
        if re.match(r"^#{2,}\s", line):
            in_migration_section = bool(
                re.search(r"migration\s+files", line, re.IGNORECASE)
            )
            continue
        if in_migration_section:
            m = re.match(r"^\s*-\s+`([^`]+)`", line)
            if m:
                migration_files.append(m.group(1).strip())
    tables = {}
    current_table = None
    for line in lines:
        h = re.match(r"^#{3,}\s+(\S+)\s+table\s*$", line, re.IGNORECASE)
        if h:
            current_table = normalize_table_name(h.group(1))
            tables[current_table] = []
            continue
        if re.match(r"^#{2,}\s", line) or re.match(r"^#{3,}\s", line):
            current_table = None
            continue
        if current_table and "|" in line:
            raw = line.strip()
            if raw.startswith("|"):
                raw = raw[1:]
            if raw.endswith("|"):
                raw = raw[:-1]
            cells = [c.strip() for c in raw.split("|")]
            if len(cells) < 2:
                continue
            first = cells[0]
            if not first or re.fullmatch(r"[-: ]+", first) or first.lower() == "column":
                continue  # separator row, header row, or empty first cell
            tables[current_table].append(first.lower())
    return migration_files, tables


def collect_sql_side(migrations_dir):
    """Return (sorted migration filenames, merged {table: [columns]})."""
    filenames = sorted(
        f for f in os.listdir(migrations_dir) if f.endswith(".sql")
    )
    merged = {}
    for fname in filenames:
        with open(os.path.join(migrations_dir, fname), "r") as fh:
            for table, columns in parse_create_tables(fh.read()).items():
                merged.setdefault(table, []).extend(
                    c for c in columns if c not in merged.get(table, [])
                )
    return filenames, merged


def compare(doc_migrations, doc_tables, sql_files, sql_tables):
    """Return sorted list of drift strings (empty list = consistent)."""
    drift = []
    for fname in sql_files:
        if fname not in doc_migrations:
            drift.append(
                "MIGRATION_FILE_UNDOCUMENTED: %s on disk but not listed in "
                "DATABASE.md Migration Files" % fname
            )
    for fname in doc_migrations:
        if fname not in sql_files:
            drift.append(
                "MIGRATION_FILE_MISSING: %s listed in DATABASE.md but absent "
                "from supabase/migrations/" % fname
            )
    for table in sorted(sql_tables):
        if table not in doc_tables:
            drift.append(
                "TABLE_UNDOCUMENTED: %s created in SQL but has no DATABASE.md "
                "schema section" % table
            )
    for table in sorted(doc_tables):
        if table not in sql_tables:
            if table.startswith("auth."):
                continue  # Supabase-managed, per DATABASE.md
            drift.append(
                "TABLE_STALE: %s documented in DATABASE.md but never created "
                "in migrations" % table
            )
    for table in sorted(doc_tables):
        if table not in sql_tables:
            continue
        doc_cols, sql_cols = doc_tables[table], sql_tables[table]
        for col in sql_cols:
            if col not in doc_cols:
                drift.append(
                    "TABLE_COLUMN_MISSING_IN_DOC: %s.%s in SQL but not in "
                    "DATABASE.md" % (table, col)
                )
        for col in doc_cols:
            if col not in sql_cols:
                drift.append(
                    "TABLE_COLUMN_STALE_IN_DOC: %s.%s documented in DATABASE.md "
                    "but not in SQL" % (table, col)
                )
    return sorted(drift)


def run(repo_root):
    doc_path = os.path.join(repo_root, "DATABASE.md")
    migrations_dir = os.path.join(repo_root, "supabase", "migrations")
    with open(doc_path, "r") as fh:
        doc_migrations, doc_tables = parse_doc(fh.read())
    sql_files, sql_tables = collect_sql_side(migrations_dir)
    print("doc side:  %d migration file(s) listed, %d table section(s): %s"
          % (len(doc_migrations), len(doc_tables),
             ", ".join(sorted(doc_tables)) or "(none)"))
    print("sql side:  %d migration file(s), %d table(s): %s"
          % (len(sql_files), len(sql_tables),
             ", ".join(sorted(sql_tables)) or "(none)"))
    drift = compare(doc_migrations, doc_tables, sql_files, sql_tables)
    if drift:
        print("DRIFT: %d finding(s)" % len(drift))
        for line in drift:
            print("  [drift] " + line)
        return 1
    print("consistent: DATABASE.md matches supabase/migrations (0 findings)")
    return 0


def main(argv):
    repo_root = argv[1] if len(argv) > 1 else DEFAULT_REPO_ROOT
    if not os.path.isfile(os.path.join(repo_root, "DATABASE.md")):
        print("error: DATABASE.md not found under %s" % repo_root, file=sys.stderr)
        return 2
    if not os.path.isdir(os.path.join(repo_root, "supabase", "migrations")):
        print("error: supabase/migrations not found under %s" % repo_root,
              file=sys.stderr)
        return 2
    return run(repo_root)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
