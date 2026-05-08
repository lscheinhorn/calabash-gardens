import { content } from "../resources/content";

const expectedContentDocs = [
  {
    id: "home",
    sections: {
      header: content.home.header,
    },
    title: "Home Header",
  },
  {
    id: "banner",
    sections: content.home.banner,
    title: "Home Banner",
  },
  {
    id: "offerings",
    sections: content.home.offerings,
    title: "Offerings",
  },
  {
    id: "about",
    sections: content.home.about,
    title: "About",
  },
  {
    id: "team",
    sections: content.home.team,
    title: "Team",
  },
];

const cloneSections = (sections) => JSON.parse(JSON.stringify(sections || {}));

export const buildContentSeed = () => ({
  contentDocs: expectedContentDocs.map((contentDoc, index) => ({
    id: contentDoc.id,
    data: {
      published: true,
      sections: cloneSections(contentDoc.sections),
      sortOrder: index,
    },
    title: contentDoc.title,
  })),
  errors: [],
  warnings: [
    "Experience blurb content is still tracked with events and should be audited in the events/content bridge phase.",
  ],
});
