const m = db.getSiblingDB("mobility");
const start = ISODate("2026-10-02T06:00:00Z");
const end = ISODate("2026-10-02T07:00:00Z");

const brokenQuery = {
  cityId: "CPH",
  fromStopId: "STOP-NORREPORT",
  toStopId: "STOP-AIRPORT",
  "departures.status": "Scheduled",
  "departures.departureUtc": { $gte: start, $lt: end },
};

const fixedQuery = {
  cityId: "CPH",
  fromStopId: "STOP-NORREPORT",
  toStopId: "STOP-AIRPORT",
  departures: {
    $elemMatch: {
      status: "Scheduled",
      departureUtc: { $gte: start, $lt: end },
    },
  },
};

print("Broken query matches:");
printjson(
  m.journey_search
    .find(brokenQuery, { _id: 1 })
    .sort({ _id: 1 })
    .toArray()
    .map((document) => document._id),
);

print("Document B departures:");
printjson(
  m.journey_search.findOne(
    { _id: "LAB05:B" },
    { _id: 1, departures: 1 },
  ),
);

print("Fixed query matches:");
printjson(
  m.journey_search
    .find(fixedQuery, { _id: 1 })
    .sort({ _id: 1 })
    .toArray()
    .map((document) => document._id),
);
