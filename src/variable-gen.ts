import * as _ from "lodash";
import cheerio from "cheerio";
import puppeteer from "puppeteer";
import * as jsonfile from "jsonfile";

const url = "https://fonts.google.com/variablefonts#font-families";

// Google made some design changes which added spaces around each element e.g. " Assistant "
const stripSpaces = (element: string) => {
  let newElement = element;

  if (element[0] === " " && element[element.length - 1] === " ") {
    newElement = element.slice(1).slice(0, -1);
  }

  return newElement;
};

const processTable = (tableHTML: string) => {
  const $ = cheerio.load(tableHTML);

  // Use Cheerio to store all relevant values in matching index arrays
  const fontIds: string[] = [];
  const fontNames: string[] = [];
  const axes: string[] = [];
  const defaults: string[] = [];
  const min: string[] = [];
  const max: string[] = [];
  const step: string[] = [];

  // Scrape each section using classnames
  $(".cdk-column-fontFamily.mat-column-fontFamily").each((index, element) => {
    // Remove first index which is table title
    if (index !== 0) {
      const value = stripSpaces($(element).text());
      fontNames.push(value);
      const id = value.replace(/\s/g, "-").toLowerCase();
      fontIds.push(id);
    }
  });
  $(".cdk-column-axes.mat-column-axes").each((index, element) => {
    if (index !== 0) {
      axes.push(stripSpaces($(element).text()));
    }
  });
  $(".cdk-column-defaultValue.mat-column-defaultValue").each(
    (index, element) => {
      if (index !== 0) {
        defaults.push(stripSpaces($(element).text()));
      }
    }
  );
  $(".cdk-column-min.mat-column-min").each((index, element) => {
    if (index !== 0) {
      min.push(stripSpaces($(element).text()));
    }
  });
  $(".cdk-column-max.mat-column-max").each((index, element) => {
    if (index !== 0) {
      max.push(stripSpaces($(element).text()));
    }
  });
  $(".cdk-column-step.mat-column-step").each((index, element) => {
    if (index !== 0) {
      step.push(stripSpaces($(element).text()));
    }
  });

  // Build variable font object
  let results = {};
  fontIds.forEach((id, index) => {
    const variableObject = {
      [id]: {
        family: fontNames[index],
        axes: {
          [axes[index]]: {
            default: defaults[index],
            min: min[index],
            max: max[index],
            step: step[index],
          },
        },
      },
    };

    // Different types of axes for the same font would generate duplicate font objects.
    // This merges a bitter.axes.ital and bitter.axes.wght into the same object when previously they were in separate 'bitter' objects.
    results = _.merge(results, variableObject);
  });

  jsonfile
    .writeFile("./lib/data/variable.json", results)
    .then(() => {
      console.log(
        `All ${
          Object.keys(results).length
        } variable font datapoints have been fetched.`
      );
    })
    .catch(err => console.error(err));
};

// Need to use Puppeteer to let JavaScript load page elements fully
const fetchPage = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tableHTML = await page.evaluate(
    () =>
      document.querySelector("#font-families > gf-font-families > table")!
        .outerHTML
  );
  await browser.close();

  processTable(tableHTML);
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
fetchPage();