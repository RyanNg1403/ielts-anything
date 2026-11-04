// An invented Listening Part 2 drill (multiple choice and a map), for tests, the dev preview page
// and checking the voices end to end.
import type { ListeningTest } from "./listening.ts";

export const SAMPLE_LISTENING: ListeningTest = {
  kind: "listening",
  mode: "drill",
  title: "Volunteering at Ashcombe Nature Reserve",
  topic: "Volunteering in a nature reserve",
  parts: [
    {
      number: 2,
      title: "Ashcombe Nature Reserve volunteers",
      context: "You will hear a warden welcoming new volunteers to a nature reserve.",
      speakers: [{ id: "warden", role: "Warden", sex: "female", accent: "british" }],
      sections: [
        {
          lines: [
            {
              speaker: "warden",
              text: "Good morning, everyone, and welcome to Ashcombe Nature Reserve. My name's Helen Price, and I'm the senior warden here. Before we head outside, I'd like to tell you a little about how the volunteer programme works.",
            },
            {
              speaker: "warden",
              text: "Most of you have signed up for Saturdays, which is our busiest day. We used to start at nine, but so many people found that difficult that we now begin at half past nine, and we finish at three.",
            },
            {
              speaker: "warden",
              text: "You don't need any special clothing apart from strong boots. We'll lend you gloves and waterproof jackets, although lots of volunteers prefer to bring their own jackets, and that's fine too.",
            },
            {
              speaker: "warden",
              text: "People often ask what the most important job is at this time of year. Clearing paths matters, of course, and so does counting birds, but in the spring our main task is repairing the fences around the meadow, so that's where most of you will start.",
            },
          ],
        },
        {
          lines: [
            {
              speaker: "warden",
              text: "Now, if you look at the map, you'll see we're in the Visitor Centre, just inside the main entrance on Mill Road. I'll show you where the places you'll need are.",
            },
            {
              speaker: "warden",
              text: "First, the tool store. Go out of the Visitor Centre and follow the path north. Just before you reach the lake, you'll see it on your left. That's where you collect equipment each morning.",
            },
            {
              speaker: "warden",
              text: "The bird hide is on the far side of the lake. Walk round the eastern shore, and you'll find it right at the northern end, looking back across the water.",
            },
            {
              speaker: "warden",
              text: "If you need a break, the picnic area is in the south-west corner of the reserve, between the woods and Mill Road. It's sheltered, so it's a good spot even on a windy day.",
            },
            {
              speaker: "warden",
              text: "And finally, the first-aid point. It used to be in the Visitor Centre, but it has moved to the car park, right next to the exit gate, so the ambulance can get to it easily.",
            },
          ],
        },
      ],
      blocks: [
        {
          family: "mcq",
          items: [
            {
              q: 1,
              stem: "What time does volunteering start on Saturdays?",
              options: [
                { letter: "A", text: "9.00" },
                { letter: "B", text: "9.30" },
                { letter: "C", text: "3.00" },
              ],
              answer: "B",
              evidence: "we now begin at half past nine",
              explanation: "Nine was the old start time; the warden says they now begin at half past nine.",
            },
            {
              q: 2,
              stem: "What must volunteers bring?",
              options: [
                { letter: "A", text: "gloves" },
                { letter: "B", text: "a waterproof jacket" },
                { letter: "C", text: "strong boots" },
              ],
              answer: "C",
              evidence: "You don't need any special clothing apart from strong boots",
              explanation: "Gloves and jackets are lent by the reserve; only boots are needed.",
            },
            {
              q: 3,
              stem: "In spring, most volunteers will work on",
              options: [
                { letter: "A", text: "repairing fences." },
                { letter: "B", text: "clearing paths." },
                { letter: "C", text: "counting birds." },
              ],
              answer: "A",
              evidence: "our main task is repairing the fences around the meadow",
              explanation: "Paths and birds are mentioned, but the main spring task is repairing fences.",
            },
          ],
        },
        {
          family: "map_labelling",
          kind: "map",
          title: "Ashcombe Nature Reserve",
          compass: true,
          features: [
            { kind: "road", label: "Mill Road", box: [], points: [[0, 64], [100, 64]] },
            { kind: "building", label: "Visitor Centre", box: [42, 48, 18, 10], points: [] },
            { kind: "water", label: "Lake", box: [38, 14, 26, 18], points: [] },
            { kind: "trees", label: "Woods", box: [4, 8, 22, 30], points: [] },
            { kind: "area", label: "Car park", box: [74, 44, 20, 14], points: [] },
            { kind: "path", label: "", box: [], points: [[51, 48], [51, 36], [66, 30], [66, 8]] },
            { kind: "building", label: "Main entrance", box: [44, 59, 14, 4], points: [] },
          ],
          markers: [
            { letter: "A", x: 46, y: 39 },
            { letter: "B", x: 56, y: 39 },
            { letter: "C", x: 51, y: 9 },
            { letter: "D", x: 30, y: 9 },
            { letter: "E", x: 14, y: 52 },
            { letter: "F", x: 30, y: 52 },
            { letter: "G", x: 90, y: 60 },
            { letter: "H", x: 76, y: 38 },
          ],
          items: [
            { q: 4, label: "Tool store", answer: "A", evidence: "you'll see it on your left", explanation: "Walking north from the Visitor Centre, the left-hand side before the lake is A." },
            { q: 5, label: "Bird hide", answer: "C", evidence: "right at the northern end, looking back across the water", explanation: "The hide is at the far, northern end of the lake: C." },
            { q: 6, label: "Picnic area", answer: "E", evidence: "between the woods and Mill Road", explanation: "South-west corner, between the woods and the road: E." },
            { q: 7, label: "First-aid point", answer: "G", evidence: "right next to the exit gate", explanation: "It moved from the Visitor Centre to the car park, beside the exit gate: G." },
          ],
        },
      ],
    },
  ],
};
