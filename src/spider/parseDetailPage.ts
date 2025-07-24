import axios from 'axios';
import { load } from 'cheerio';
import { Campsite, CampsiteImage } from '../types';

export async function parseDetailPage(url: string): Promise<Partial<Campsite> | null> {
  try {
    const { data } = await axios.get(url);
    const $ = load(data);

    let name = $('div.field.contact-block.-title h4 a').first().text().trim();
    if (!name) {
      name = $('h1.page-title').first().text().trim();
    }
    if (!name) {
      name = $('title').first().text().trim();
    }

    let description = '';
    const body = $('div.field.contact-block.-body');
    let overviewP = '';
    const overviewHeading = body.find('h2:contains("Overview"), h3:contains("Overview")').first();
    if (overviewHeading.length) {
      const nextP = overviewHeading.nextAll('p').first();
      if (nextP.length) {
        overviewP = nextP.text().trim();
      }
    }
    let metaDesc = $('meta[name="description"]').attr('content') ?? '';
    let firstP = $('p').first().text().trim();
    const descParts = [overviewP, metaDesc, firstP]
      .map(s => s.trim())
      .filter((s, i, arr) => s && arr.indexOf(s) === i);
    description = descParts.join('\n\n');

    let state: string | undefined;
    const stateDiv = $('.field.contact-block.-state');

    let directions: string | undefined;
    const directionsDiv = $('.field.contact-block.-directions');
    if (directionsDiv.length) {
      directions = directionsDiv
        .find('p, li')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean)
        .join(' ');
      if (!directions) {
        directions = directionsDiv.text().trim();
      }
    }

    let wildlife: string[] | undefined;
    const wildlifeHeading = $('h4, h3').filter((_, el) => $(el).text().toLowerCase().includes('wildlife')).first();
    if (wildlifeHeading.length) {
      const wildlifeList = wildlifeHeading.nextAll('ul').first();
      if (wildlifeList.length) {
        wildlife = wildlifeList.find('li').map((_, el) => $(el).text().trim()).get().filter(Boolean);
      }
    }


    let fees: string | undefined;
    const feesDiv = $('.field.contact-block.-fee-description');
    if (feesDiv.length) {
      fees = feesDiv.text().trim();
    }

    let stayLimit: string | undefined;
    const stayLimitDiv = $('.field.contact-block.-stay-limit');
    if (stayLimitDiv.length) {
      stayLimit = stayLimitDiv.text().trim();
    }

    const activities: string[] = [];

    const bodyText = $('div.field.contact-block.-body').text().toLowerCase();
    const activityKeywords = ["ACCESSIBLE FACILITY OR ACTIVITY", "SAILBOARDING", "ACCESSIBLE SWIMMING", "AMPHITHEATER", "BACKPACKING", "BEACHCOMBING", "BERRY PICKING", "BIKING", "BIRD WATCHING", "BIRDING", "BOATING", "BOULDERING", "CAMPING", "CAMPING AREA", "CANOEING", "CANYONEERING", "CAVING", "CLIMBING", "CROSS COUNTRY SKIING", "CULTURAL ACTIVITIES", "DAY USE AREA", "DISC GOLF", "DISPERSED CAMPING", "DIVING", "DOG MUSHING", "DOGS ON LEASH (LEASH REQUIRED)", "DOWNHILL SKIING", "E-BIKING, CLASS 1", "E-BIKING, CLASS 2", "E-BIKING, CLASS 3", "EDUCATIONAL PROGRAMS", "ENVIRONMENTAL EDUCATION", "EVENING PROGRAMS", "FAT TIRE BIKING", "FIRE LOOKOUTS/CABINS OVERNIGHT", "FISH HATCHERY", "FISH VIEWING SITE", "FISHING", "FLY FISHING", "GEOCACHING", "GOLD PANNING", "GUIDED INTERPRETIVE WALKS", "HANG GLIDING - PARASAILING", "HIKING", "HISTORIC & CULTURAL SITE", "HISTORIC SITES", "HORSE CAMPING", "HORSEBACK RIDING", "HOT SPRINGS SOAKING", "HUNTING", "ICE CLIMBING", "ICE FISHING", "INFORMATION SITE", "INTERPRETIVE PROGRAMS", "JET SKIING", "KAYAKING", "LAND - SAND SAILING", "LONG TERM VISITOR AREA", "MOTOR BOAT", "MOUNTAIN BIKING", "MOUNTAIN CLIMBING", "NON-MOTORIZED BOATING", "OFF HIGHWAY VEHICLE", "OHV USE - ULTRALIGHT", "PADDLE BOATING", "PADDLING", "PHOTOGRAPHY", "PICNICKING", "PLAYGROUND PARK SPECIALIZED SPORT SITE", "RAFTING", "RANGER STATION", "RECREATIONAL SHOOTING", "RECREATIONAL VEHICLES", "ROCK CLIMBING", "ROCKHOUNDING", "SAILING", "SCENIC DRIVE", "SCUBA DIVING", "SEA KAYAKING", "SHOOTING RANGE", "SKATE SKIING", "SKIING", "SKIJORING", "SLEDDING", "SNORKELING", "SNOW FAT TIRE BIKING", "SNOW TUBING", "SNOWBOARDING", "SNOWMOBILE", "SNOWMOBILE TRAILS", "SNOWMOBILING", "SNOWPARK", "SNOWSHOEING", "SOFTBALL FIELDS", "STARGAZING", "SURFING", "SWIMMING", "SWIMMING SITE", "TRAIL RUNNING", "TRAILS, HORSE", "TRAPPING", "TUBING", "VISITOR CENTER", "WATER ACCESS", "WATER SKIING", "WATER SPORTS", "WHALE WATCHING", "WHITEWATER RAFTING", "WILD HORSE VIEWING", "WILDERNESS", "WILDLIFE VIEWING", "WINDSURFING", "WINTER SPORTS"];
    for (const keyword of activityKeywords) {
      if (bodyText.includes(keyword.toLowerCase()) && !activities.includes(keyword)) {
        activities.push(keyword);
      }
    }

    const campgrounds: string[] = [];
    $('div.field.contact-block.-body h3, div.field.contact-block.-body u').each((_, el) => {
      const text = $(el).text().trim();
      if (/campground/i.test(text) && !campgrounds.includes(text)) campgrounds.push(text);
    });

    if (stateDiv.length) {
      state = stateDiv.text().trim();
    }

    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;
    const geoBlock = $('h2:contains("Geographic Coordinates")').parent();
    if (geoBlock.length) {
      const latText = geoBlock.find('.views-field-field-latitude .field-content').first().text().trim();
      const lngText = geoBlock.find('.views-field-field-longitude .field-content').first().text().trim();
      if (latText && lngText) {
        lat = parseFloat(latText);
        lng = parseFloat(lngText);
      }
    }

    if (name) {
      name = name.replace(/\s*\|\s*Bureau of Land Management\s*$/, '');
    }

    let images: CampsiteImage[] | undefined;
    const imageBlocks = $('div.ridb-image-content');

    if (imageBlocks.length) {
      images = imageBlocks.map((_, el): CampsiteImage | null => {
        const img = $(el).find('img').first();
        const src = img.attr('src')?.trim();
        const alt = img.attr('alt')?.trim() ?? undefined;
        const credit = $(el).find('.field-credit').text().trim() || undefined;

        if (!src) return null;

        return {
          src,
          alt,
          credit,
        };
      }).get().filter((img): img is CampsiteImage => !!img);
    }

    return {
      name,
      description,
      lat,
      lng,
      state,
      directions,
      fees,
      stayLimit,
      images: images && images.length ? images : undefined,
      wildlife: wildlife && wildlife.length ? wildlife : undefined,
      activities: activities.length ? activities : undefined,
      campgrounds: campgrounds.length ? campgrounds : undefined,
    };
  } catch (err) {
    console.error(`Error parsing ${url}`, err);
    return null;
  }
}