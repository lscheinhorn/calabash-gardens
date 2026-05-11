import { content } from "../resources/content";
import { experienceBlurb } from "../resources/events";

const experienceBlurbSections = {
  paragraphs: Object.fromEntries(experienceBlurb.map((paragraph, index) => [
    `paragraph_${index + 1}`,
    paragraph,
  ])),
};

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
  {
    id: "experienceBlurb",
    sections: experienceBlurbSections,
    title: "Experience Blurb",
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
  warnings: [],
});
