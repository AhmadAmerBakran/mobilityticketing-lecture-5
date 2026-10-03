const m = db.getSiblingDB("mobility");

function requireText(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function search(cityId, fromStopId, toStopId, start, end) {
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

const start = ISODate("2026-10-02T06:00:00Z");
const end = ISODate("2026-10-02T07:00:00Z");

printjson(search("CPH", "STOP-NORREPORT", "STOP-AIRPORT", start, end));
