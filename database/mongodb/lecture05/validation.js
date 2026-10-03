const m = db.getSiblingDB("mobility");
const invalidIds = ["LAB05:INVALID-DATE", "LAB05:INVALID-SEATS"];

m.journey_search.deleteMany({ _id: { $in: invalidIds } });

function expectValidationError(name, document) {
  try {
    m.journey_search.insertOne(document);
    print(`${name}: insert unexpectedly succeeded`);
    m.journey_search.deleteOne({ _id: document._id });
  } catch (error) {
    printjson({
      test: name,
      code: error.code,
      validationError: error.code === 121,
    });
  }
}

const invalidDate = m.journey_search.findOne({ _id: "LAB05:A" });
invalidDate._id = "LAB05:INVALID-DATE";
invalidDate.departures[0].departureUtc = "2026-10-02T06:20:00Z";
expectValidationError("departureUtc must be a date", invalidDate);

const invalidSeats = m.journey_search.findOne({ _id: "LAB05:A" });
invalidSeats._id = "LAB05:INVALID-SEATS";
invalidSeats.departures[0].availableSeats = NumberInt(-1);
expectValidationError("availableSeats cannot be negative", invalidSeats);
