const m = db.getSiblingDB("mobility");
const fixture = m.journey_search
  .find({ _id: /^LAB05:[A-F]$/ })
  .sort({ _id: 1 })
  .toArray();

if (fixture.length !== 6) {
  throw new Error("Run setup.js before updates.js");
}

function freshFixture() {
  return fixture.map((document) => EJSON.parse(EJSON.stringify(document)));
}

function restoreFixture() {
  m.journey_search.deleteMany({ _id: /^LAB05:/ });
  m.journey_search.insertMany(freshFixture());
}

function searchTripIds(fromStopId, toStopId, start, end) {
  return m.journey_search
    .aggregate([
      {
        $match: {
          cityId: "CPH",
          fromStopId,
          toStopId,
          departures: {
            $elemMatch: {
              status: "Scheduled",
              departureUtc: { $gte: start, $lt: end },
            },
          },
        },
      },
      { $unwind: "$departures" },
      {
        $match: {
          "departures.status": "Scheduled",
          "departures.departureUtc": { $gte: start, $lt: end },
        },
      },
      { $sort: { "departures.departureUtc": 1 } },
      { $project: { _id: 0, tripId: "$departures.tripId" } },
    ])
    .toArray()
    .map((row) => row.tripId);
}

function copiesOfTrip() {
  return m.journey_search
    .aggregate([
      { $match: { "departures.tripId": "LAB05-T-OK" } },
      { $unwind: "$departures" },
      { $match: { "departures.tripId": "LAB05-T-OK" } },
      {
        $project: {
          _id: 1,
          toStopId: 1,
          tripId: "$departures.tripId",
          status: "$departures.status",
          departureUtc: "$departures.departureUtc",
          arrivalUtc: "$departures.arrivalUtc",
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();
}

restoreFixture();

const cancelTrip = () =>
  m.journey_search.updateMany(
    {
      _id: /^LAB05:/,
      "departures.tripId": "LAB05-T-OK",
    },
    {
      $set: {
        "departures.$[trip].status": "Cancelled",
      },
    },
    {
      arrayFilters: [{ "trip.tripId": "LAB05-T-OK" }],
    },
  );

print("Cancel every copy:");
printjson(cancelTrip());
print("Run the same update again:");
printjson(cancelTrip());
printjson({
  searchAfterCancellation: searchTripIds(
    "STOP-NORREPORT",
    "STOP-AIRPORT",
    ISODate("2026-10-02T06:00:00Z"),
    ISODate("2026-10-02T07:00:00Z"),
  ),
});

restoreFixture();

m.journey_search.updateOne(
  { _id: "LAB05:A" },
  { $set: { "departures.$[trip].status": "Cancelled" } },
  { arrayFilters: [{ "trip.tripId": "LAB05-T-OK" }] },
);

print("Only document A is cancelled:");
printjson(copiesOfTrip());
printjson({
  airport: searchTripIds(
    "STOP-NORREPORT",
    "STOP-AIRPORT",
    ISODate("2026-10-02T06:00:00Z"),
    ISODate("2026-10-02T07:00:00Z"),
  ),
  central: searchTripIds(
    "STOP-NORREPORT",
    "STOP-CENTRAL",
    ISODate("2026-10-02T06:00:00Z"),
    ISODate("2026-10-02T07:00:00Z"),
  ),
});

print("Repair the remaining copy:");
printjson(
  m.journey_search.updateMany(
    {
      _id: /^LAB05:/,
      departures: {
        $elemMatch: {
          tripId: "LAB05-T-OK",
          status: "Scheduled",
        },
      },
    },
    { $set: { "departures.$[trip].status": "Cancelled" } },
    { arrayFilters: [{ "trip.tripId": "LAB05-T-OK" }] },
  ),
);
printjson(copiesOfTrip());
printjson({
  airport: searchTripIds(
    "STOP-NORREPORT",
    "STOP-AIRPORT",
    ISODate("2026-10-02T06:00:00Z"),
    ISODate("2026-10-02T07:00:00Z"),
  ),
  central: searchTripIds(
    "STOP-NORREPORT",
    "STOP-CENTRAL",
    ISODate("2026-10-02T06:00:00Z"),
    ISODate("2026-10-02T07:00:00Z"),
  ),
});

restoreFixture();

print("Move every copy to 07:05:");
printjson(
  m.journey_search.updateMany(
    {
      _id: /^LAB05:/,
      "departures.tripId": "LAB05-T-OK",
    },
    {
      $set: {
        "departures.$[trip].departureUtc": ISODate("2026-10-02T07:05:00Z"),
        "departures.$[trip].arrivalUtc": ISODate("2026-10-02T07:25:00Z"),
      },
    },
    { arrayFilters: [{ "trip.tripId": "LAB05-T-OK" }] },
  ),
);
printjson(copiesOfTrip());
printjson({
  from0600To0700: searchTripIds(
    "STOP-NORREPORT",
    "STOP-AIRPORT",
    ISODate("2026-10-02T06:00:00Z"),
    ISODate("2026-10-02T07:00:00Z"),
  ),
  from0700To0800: searchTripIds(
    "STOP-NORREPORT",
    "STOP-AIRPORT",
    ISODate("2026-10-02T07:00:00Z"),
    ISODate("2026-10-02T08:00:00Z"),
  ),
});

restoreFixture();

print("Change the LINE-M2 price in CPH:");
printjson(
  m.journey_search.updateMany(
    { cityId: "CPH", routeId: "LINE-M2" },
    { $set: { price: NumberDecimal("40.00") } },
  ),
);
printjson(
  m.journey_search
    .find(
      { _id: /^LAB05:/ },
      { _id: 1, cityId: 1, routeId: 1, price: 1 },
    )
    .sort({ _id: 1 })
    .toArray(),
);
