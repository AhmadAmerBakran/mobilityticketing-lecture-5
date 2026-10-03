const m = db.getSiblingDB("mobility");
const source = m.journey_search
  .find({ _id: /^LAB05:[A-F]$/ })
  .sort({ _id: 1 })
  .toArray();

if (source.length !== 6) {
  throw new Error("Run setup.js before alternative.js");
}

m.journey_search_by_trip.drop();

m.createCollection("journey_search_by_trip", {
  validationLevel: "strict",
  validationAction: "error",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "_id",
        "cityId",
        "routeId",
        "fromStopId",
        "toStopId",
        "tripId",
        "departureUtc",
        "arrivalUtc",
        "status",
        "availableSeats",
        "price",
        "currency",
        "schemaVersion",
      ],
      properties: {
        _id: { bsonType: "string" },
        cityId: { bsonType: "string" },
        routeId: { bsonType: "string" },
        fromStopId: { bsonType: "string" },
        toStopId: { bsonType: "string" },
        tripId: { bsonType: "string" },
        departureUtc: { bsonType: "date" },
        arrivalUtc: { bsonType: "date" },
        status: { enum: ["Scheduled", "Cancelled"] },
        availableSeats: { bsonType: "int", minimum: 0 },
        price: { bsonType: "decimal" },
        currency: { enum: ["DKK"] },
        schemaVersion: { bsonType: "int", minimum: 1 },
      },
    },
  },
});

const documents = [];

for (const journey of source) {
  for (const departure of journey.departures) {
    documents.push({
      _id: [
        "LAB05",
        journey.cityId,
        journey.routeId,
        journey.fromStopId,
        journey.toStopId,
        departure.tripId,
      ].join(":"),
      cityId: journey.cityId,
      routeId: journey.routeId,
      fromStopId: journey.fromStopId,
      toStopId: journey.toStopId,
      tripId: departure.tripId,
      departureUtc: departure.departureUtc,
      arrivalUtc: departure.arrivalUtc,
      status: departure.status,
      availableSeats: departure.availableSeats,
      price: journey.price,
      currency: journey.currency,
      schemaVersion: journey.schemaVersion,
    });
  }
}

m.journey_search_by_trip.insertMany(documents);

function requireText(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function validateSearch(cityId, fromStopId, toStopId, start, end) {
  requireText(cityId, "cityId");
  requireText(fromStopId, "fromStopId");
  requireText(toStopId, "toStopId");

  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    throw new Error("start must be a valid date");
  }

  if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
    throw new Error("end must be a valid date");
  }

  if (end <= start) {
    throw new Error("end must be later than start");
  }
}

function searchNested(cityId, fromStopId, toStopId, start, end) {
  validateSearch(cityId, fromStopId, toStopId, start, end);

  return m.journey_search
    .aggregate([
      {
        $match: {
          cityId,
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
      {
        $project: {
          _id: 0,
          cityId: 1,
          routeId: 1,
          fromStopId: 1,
          toStopId: 1,
          tripId: "$departures.tripId",
          departureUtc: "$departures.departureUtc",
          arrivalUtc: "$departures.arrivalUtc",
          availableSeats: "$departures.availableSeats",
          price: 1,
          currency: 1,
        },
      },
      { $sort: { departureUtc: 1 } },
    ])
    .toArray();
}

function searchByTrip(cityId, fromStopId, toStopId, start, end) {
  validateSearch(cityId, fromStopId, toStopId, start, end);

  return m.journey_search_by_trip
    .find(
      {
        cityId,
        fromStopId,
        toStopId,
        status: "Scheduled",
        departureUtc: { $gte: start, $lt: end },
      },
      {
        _id: 0,
        cityId: 1,
        routeId: 1,
        fromStopId: 1,
        toStopId: 1,
        tripId: 1,
        departureUtc: 1,
        arrivalUtc: 1,
        availableSeats: 1,
        price: 1,
        currency: 1,
      },
    )
    .sort({ departureUtc: 1 })
    .toArray();
}

const tests = [
  {
    name: "Nørreport to Airport, 06:00 to 07:00",
    from: "STOP-NORREPORT",
    to: "STOP-AIRPORT",
    start: "2026-10-02T06:00:00Z",
    end: "2026-10-02T07:00:00Z",
    expected: ["LAB05-T-OK"],
  },
  {
    name: "End at 06:20",
    from: "STOP-NORREPORT",
    to: "STOP-AIRPORT",
    start: "2026-10-02T06:00:00Z",
    end: "2026-10-02T06:20:00Z",
    expected: [],
  },
  {
    name: "Start at 06:20",
    from: "STOP-NORREPORT",
    to: "STOP-AIRPORT",
    start: "2026-10-02T06:20:00Z",
    end: "2026-10-02T07:00:00Z",
    expected: ["LAB05-T-OK"],
  },
  {
    name: "Airport to Nørreport",
    from: "STOP-AIRPORT",
    to: "STOP-NORREPORT",
    start: "2026-10-02T06:00:00Z",
    end: "2026-10-02T07:00:00Z",
    expected: ["LAB05-T-E"],
  },
  {
    name: "Same search on 3 October",
    from: "STOP-NORREPORT",
    to: "STOP-AIRPORT",
    start: "2026-10-03T06:00:00Z",
    end: "2026-10-03T07:00:00Z",
    expected: ["LAB05-T-F"],
  },
  {
    name: "No matching destination",
    from: "STOP-NORREPORT",
    to: "STOP-NO-MATCH",
    start: "2026-10-02T06:00:00Z",
    end: "2026-10-02T07:00:00Z",
    expected: [],
  },
];

printjson({
  alternativeDocuments: m.journey_search_by_trip.countDocuments(),
});

for (const test of tests) {
  const start = ISODate(test.start);
  const end = ISODate(test.end);
  const nested = searchNested("CPH", test.from, test.to, start, end).map(
    (row) => row.tripId,
  );
  const byTrip = searchByTrip("CPH", test.from, test.to, start, end).map(
    (row) => row.tripId,
  );

  printjson({
    test: test.name,
    expected: test.expected,
    nested,
    byTrip,
    sameResult: JSON.stringify(nested) === JSON.stringify(byTrip),
    passed: JSON.stringify(byTrip) === JSON.stringify(test.expected),
  });
}

print("Cancel LAB05-T-OK in the alternative model:");
printjson(
  m.journey_search_by_trip.updateMany(
    { tripId: "LAB05-T-OK" },
    { $set: { status: "Cancelled" } },
  ),
);
