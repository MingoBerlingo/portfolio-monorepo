# Payload Blank Template

This template comes configured with the bare minimum to get started on anything you need.

## Quick start

This template can be deployed directly from our Cloud hosting and it will setup MongoDB and cloud S3 object storage for media.

## Quick Start - local setup

To spin up this template locally, follow these steps:

### Clone

After you click the `Deploy` button above, you'll want to have standalone copy of this repo on your machine. If you've already cloned this repo, skip to [Development](#development).

### Development

1. First [clone the repo](#clone) if you have not done so already
2. `cd my-project && cp .env.example .env` to copy the example environment variables. You'll need to add the `MONGODB_URI` from your Cloud project to your `.env` if you want to use S3 storage and the MongoDB database that was created for you.

3. `pnpm install && pnpm dev` to install dependencies and start the dev server
4. open `http://localhost:3000` to open the app in your browser

That's it! Changes made in `./src` will be reflected in your app. Follow the on-screen instructions to login and create your first admin user. Then check out [Production](#production) once you're ready to build and serve your app, and [Deployment](#deployment) when you're ready to go live.

#### Docker (Optional)

If you prefer to use Docker for local development instead of a local MongoDB instance, the provided docker-compose.yml file can be used.

To do so, follow these steps:

- Modify the `MONGODB_URI` in your `.env` file to `mongodb://127.0.0.1/<dbname>`
- Modify the `docker-compose.yml` file's `MONGODB_URI` to match the above `<dbname>`
- Run `docker-compose up` to start the database, optionally pass `-d` to run in the background.

## How it works

The Payload config is tailored specifically to the needs of most websites. It is pre-configured in the following ways:

### Collections

See the [Collections](https://payloadcms.com/docs/configuration/collections) docs for details on how to extend this functionality.

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel.

  For additional help, see the official [Auth Example](https://github.com/payloadcms/payload/tree/main/examples/auth) or the [Authentication](https://payloadcms.com/docs/authentication/overview#authentication-overview) docs.

- #### Media

  This is the uploads enabled collection. It features pre-configured sizes, focal point and manual resizing to help you manage your pictures.

### Docker

Alternatively, you can use [Docker](https://www.docker.com) to spin up this template locally. To do so, follow these steps:

1. Follow [steps 1 and 2 from above](#development), the docker-compose file will automatically use the `.env` file in your project root
1. Next run `docker-compose up`
1. Follow [steps 4 and 5 from above](#development) to login and create your first admin user

That's it! The Docker instance will help you get up and running quickly while also standardizing the development environment across your teams.

## Questions

If you have any issues or questions, reach out to us on [Discord](https://discord.com/invite/payload) or start a [GitHub discussion](https://github.com/payloadcms/payload/discussions).

### Canonical Resume migration

Stop the CMS before applying the storage migration. From `apps/cms`, run
`pnpm exec tsx scripts/migrate-canonical-resume.ts` for a read-only dry run with
`DATABASE_URI` in the environment or `.env`. Add
`--apply --backup=/absolute/path/new-resume-backup.json` to apply. The backup must
be a new file, is written with owner-only permissions before any writes, and
contains BSON-preserving Extended JSON for all affected collections. Keep it
private: it contains confidential profile content. No legacy stored fields or
Resume documents are deleted; the removed schemas only hide them from APIs.
Re-running skips existing canonical values and imported collection entries.
Array translation lines align to existing row order; extra translated lines
become extra rows with the available locale. Review translated row order after
migration. Publication/research rows match by legacy row ID, then URL, then row
index; unmatched rows remain separate so text is never discarded.

### Migrate Profile skills and languages

For an existing local CMS, run the migration from `apps/cms` before editing the new fields.

```sh
pnpm exec tsx scripts/migrate-profile-skills.ts
pnpm exec tsx scripts/migrate-profile-skills.ts --apply --backup=/absolute/path/new-profile-backup.json
```

The first command previews the field changes. The second saves a private backup and converts the English and Italian Profile values to lists. The migration preserves populated lists on rerun.

### Media loading previews

Image and video uploads automatically store a tiny JPEG in `previewDataURL`.
Replacing a file regenerates its preview; preview-generation failure clears the
old value and leaves the original upload usable. Previews are embedded in the
static website, so no CMS request is needed to display them.

To fill missing previews for existing local media, run from the repository root:

```sh
pnpm --filter cms backfill:media-previews
```

The command skips existing previews, preserves original files, logs failed files,
and exits nonzero if a preview could not be generated. It can be rerun safely.
Video previews reuse the existing FFmpeg installation and representative-frame
extraction; image previews use Sharp. The frontend falls back to a neutral shimmer
when no preview is available, disables shimmer for reduced motion, and exposes
manual video controls when automatic playback is unavailable.
