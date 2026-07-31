import * as cheerio from "cheerio";

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function parseFaqQuestions(html: string): string[] {
  const $ = cheerio.load(html);
  const questions: string[] = [];

  $("#div_faq h3").each((_, element) => {
    const text = collapseWhitespace($(element).text());
    if (text) questions.push(text);
  });

  return questions;
}
