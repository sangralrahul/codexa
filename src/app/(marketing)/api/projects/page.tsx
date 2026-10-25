import { routeMetadata } from "@/lib/seo";
import { DevArticle } from "@/components/docs/dev-article";

export const metadata = routeMetadata("/api/projects");

const md = `
Projects are the main resource. These endpoints create, list, update and delete projects and work with their files, snapshots, activity, environment variables and share links. All of them require a session; the minimum role is noted per call. Exact request and response shapes are in the [reference](/api/reference#group-projects).

## Projects

| Method | Path                               | Role    | Purpose                                        |
| ------ | ---------------------------------- | ------- | ---------------------------------------------- |
| GET    | \`/api/v1/projects?workspaceId=\`    | viewer  | List projects in a workspace                   |
| POST   | \`/api/v1/projects\`                 | editor  | Create from a template; enforces the plan's project limit |
| GET    | \`/api/v1/projects/:id\`             | viewer  | Project with your role and its workspace       |
| PATCH  | \`/api/v1/projects/:id\`             | editor  | Name, description, visibility, settings        |
| DELETE | \`/api/v1/projects/:id\`             | admin   | Soft delete                                    |
| POST   | \`/api/v1/projects/:id/duplicate\`   | editor  | Copy files and env var names into a new project |

\`\`\`bash
curl -b cookies.txt -X POST "$HOST/api/v1/projects" \\
  -H 'Content-Type: application/json' \\
  -d '{"workspaceId":"ws_…","name":"task-tracker","templateId":"vite-react-minimal"}'
\`\`\`

Creating beyond the plan limit returns \`402 quota_exceeded\` with \`details.kind = "projects"\`.

## Files

| Method | Path                                         | Role   | Purpose                               |
| ------ | -------------------------------------------- | ------ | ------------------------------------- |
| GET    | \`/api/v1/projects/:id/files\`                 | viewer | Tree: \`[{ path, size, updatedAt }]\`     |
| GET    | \`/api/v1/projects/:id/files/content?path=\`   | viewer | One file's content                    |
| PUT    | \`/api/v1/projects/:id/files/content\`         | editor | Create or overwrite \`{ path, content }\` |
| POST   | \`/api/v1/projects/:id/files/rename\`          | editor | \`{ from, to, isFolder? }\`              |
| DELETE | \`/api/v1/projects/:id/files?path=\` (+\`&folder=1\`) | editor | Delete a file or folder          |
| GET    | \`/api/v1/projects/:id/search?q=\`             | viewer | Text search: \`[{ path, line, text }]\`   |

Paths are relative to the project root; \`..\` segments and absolute paths are rejected with 400. Writes that would exceed the storage quota return 402.

## Snapshots

| Method | Path                                              | Role   | Purpose                                  |
| ------ | ------------------------------------------------- | ------ | ---------------------------------------- |
| GET    | \`/api/v1/projects/:id/snapshots\`                  | viewer | List                                     |
| POST   | \`/api/v1/projects/:id/snapshots\`                  | editor | \`{ name, message? }\`                      |
| GET    | \`/api/v1/projects/:id/snapshots/:sid\`             | viewer | Snapshot plus a per-file diff vs current |
| POST   | \`/api/v1/projects/:id/snapshots/:sid/restore\`     | editor | Replace current files                    |

The diff is an array of \`{ path, status: "added" | "modified" | "deleted", before?, after? }\` entries.

## Activity, environment variables, sharing

| Method       | Path                                     | Role   | Purpose                                                  |
| ------------ | ---------------------------------------- | ------ | -------------------------------------------------------- |
| GET          | \`/api/v1/projects/:id/activity\`          | viewer | Event log                                                |
| GET/PUT/DELETE | \`/api/v1/projects/:id/env\`             | editor | Masked by default; \`?reveal=1\` decrypts for editors       |
| POST         | \`/api/v1/projects/:id/share\`             | editor | \`{ access: "view" | "edit", expiresInDays? }\` → \`{ url }\` |
| DELETE       | \`/api/v1/projects/:id/share/:linkId\`     | editor | Revoke                                                   |

Environment variable values are never included in any other response, including AI context and activity entries.

## Templates

\`GET /api/v1/templates?q=&category=&framework=&sort=\` is public and returns template metadata without files. It is listed as planned until its handler lands; the [templates](/templates) pages are served from the same data.
`;

export default function ApiProjectsPage() {
  return <DevArticle path="/api/projects" markdown={md} />;
}
