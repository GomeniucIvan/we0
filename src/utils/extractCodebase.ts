import fs from 'node:fs';
import path from 'node:path';
import ignore from 'ignore';

// Extensions to include when summarising the repository
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.json'];
// Directories to skip by default
const DEFAULT_EXCLUDES = ['node_modules', '.git', 'dist', 'build'];

interface CacheEntry {
  timestamp: number;
  summary: string;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Recursively walk a directory and collect file contents.
 */
function walk(dir: string, ig: ignore.Ignore, files: string[], baseDir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    if (ig.ignores(relPath)) continue;

    if (entry.isDirectory()) {
      walk(fullPath, ig, files, baseDir);
    } else {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          files.push(`### ${relPath}\n\n\u0060\u0060\u0060${ext.slice(1)}\n${content}\n\u0060\u0060\u0060`);
        } catch {
          // Ignore unreadable files
        }
      }
    }
  }
}

/**
 * Extract a markdown summary of the current repository's codebase.
 * The result is cached for a short period to avoid heavy filesystem work.
 */
export async function extractCodebase(rootDir: string = process.cwd()): Promise<string> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.summary;
  }

  const ig = ignore();
  DEFAULT_EXCLUDES.forEach((dir) => ig.add(dir));
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    ig.add(gitignoreContent);
  }

  const collected: string[] = [];
  walk(rootDir, ig, collected, rootDir);
  const summary = collected.join('\n\n');
  cache = { summary, timestamp: Date.now() };
  return summary;
}

export default extractCodebase;
