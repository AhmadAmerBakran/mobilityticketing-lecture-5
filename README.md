# MobilityTicketing lecture 5

This repository contains the week 40 MongoDB lab for MobilityTicketing. PostgreSQL is kept as the relational source of truth, while MongoDB is used as a read model for direct journey search.

## Running the lab

Start MongoDB and load the fixture:

```bash
docker compose up -d --wait mongo
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/setup.js
```

The scripts can then be run directly with `mongosh`:

```bash
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/validation.js
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/search.js
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/search_bug.js
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/updates.js
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/growth.js
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/alternative.js
```

To get the original fixture back between experiments:

```bash
docker compose exec -T mongo mongosh --quiet --file /scripts/lecture05/reset.js
```

The observations from the exercises and the comparison of the two document models are in `database/mongodb/lecture05/notes.md`.
