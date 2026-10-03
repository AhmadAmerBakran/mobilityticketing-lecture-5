const m = db.getSiblingDB("mobility");
const original = m.journey_search.findOne({ _id: "LAB05:A" });

if (!original) {
  throw new Error("Run setup.js before growth.js");
}

function departures(count) {
  return Array.from({ length: count }, (_, index) => ({
    ...original.departures[0],
    tripId: `LAB05-GROWTH-${index}`,
  }));
}

function measure() {
  return m.journey_search
    .aggregate([
      { $match: { _id: "LAB05:GROWTH" } },
      {
        $project: {
          _id: 0,
          bytes: { $bsonSize: "$$ROOT" },
          departures: { $size: "$departures" },
        },
      },
    ])
    .toArray()[0];
}

m.journey_search.deleteOne({ _id: "LAB05:GROWTH" });

m.journey_search.insertOne({
  ...original,
  _id: "LAB05:GROWTH",
  departures: departures(100),
});

const with100 = measure();

m.journey_search.updateOne(
  { _id: "LAB05:GROWTH" },
  { $set: { departures: departures(1000) } },
);

const with1000 = measure();

printjson({ with100, with1000 });
