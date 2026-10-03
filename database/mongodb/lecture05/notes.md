# Lab notes

## Search

The search uses an inclusive start and an exclusive end. A departure at 06:20 is therefore excluded when the end is 06:20, but included when the start is 06:20.

The fixture gives these results:

```text
Nørreport -> Airport, 06:00 to 07:00    LAB05-T-OK
End at 06:20                            no result
Start at 06:20                          LAB05-T-OK
Airport -> Nørreport                    LAB05-T-E
3 October, 06:00 to 07:00               LAB05-T-F
STOP-NO-MATCH                            no result
```

Empty stop IDs and a time interval where `end <= start` are rejected before the query is run.

## Array query

Document B shows why separate conditions on array fields are unsafe here. `LAB05-T-B1` is Scheduled but leaves at 05:55, while `LAB05-T-B2` leaves at 06:15 but is Cancelled. With two separate dot-notation conditions MongoDB can satisfy the status condition with one array element and the time condition with another one. `$elemMatch` fixes it by requiring both conditions to be true on the same departure.

## Updates

`LAB05-T-OK` is stored in documents A and C. The first cancellation matches two documents and modifies two. Running exactly the same update again still matches both documents, but `modifiedCount` is zero because both copies are already Cancelled.

Cancelling only the copy in A makes the Airport search disagree with the Central search. Repairing the remaining copy makes both searches agree again. Moving both copies to 07:05 removes the trip from the 06:00 to 07:00 window and makes it appear in the 07:00 to 08:00 window.

The price update for `cityId = CPH` and `routeId = LINE-M2` changes A, C, E and F. B has another route ID. D has `LINE-M2`, but belongs to another city, so it must keep the old price. This price belongs to the MongoDB read model and does not change ticket prices already stored in PostgreSQL.

## Document growth

With the supplied fixture, the growth document is 12,307 bytes with 100 departures and 123,007 bytes with 1,000 departures. The size grows almost linearly with the array. I would keep the document bounded by service date and only keep the departure window needed for journey search.

## Document boundary

The original model keeps several departures in one journey document. It is convenient when the whole group is read together, but the query has to handle an array correctly and the document keeps growing as departures are added.

`journey_search_by_trip` keeps one dated trip and stop pair per document. The search becomes a normal top-level filter, changing a departure is simpler, and document size stays predictable. It does create more documents, and duplication does not disappear completely because `LAB05-T-OK` still needs one document for Airport and another for Central.

For the next step I would continue with `journey_search_by_trip`. For this workload the simpler query and bounded document size are more useful than grouping several departures into one document. The remaining duplication is visible and can be handled explicitly when a trip changes.
