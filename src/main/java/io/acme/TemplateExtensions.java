package io.acme;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import io.quarkiverse.roq.frontmatter.runtime.model.DocumentPage;
import io.quarkiverse.roq.frontmatter.runtime.model.Page;
import io.quarkiverse.roq.frontmatter.runtime.model.Site;
import io.quarkiverse.roq.plugin.lunr.runtime.RoqPluginLunrTemplateExtension;
import io.quarkiverse.tools.stringpaths.StringPaths;
import io.quarkus.qute.RawString;
import io.quarkus.qute.TemplateExtension;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

@TemplateExtension
public class TemplateExtensions {

    static DocumentPage relatedPost(DocumentPage swipePage) {
        var posts = swipePage.site().collections().get("digest-posts");
        if (posts == null)
            return null;
        var date = swipePage.date();
        for (var p : posts) {
            if (p.date().equals(date))
                return p;
        }
        return null;
    }

    static String join(JsonArray array, String separator) {
        var sb = new StringBuilder();
        for (int i = 0; i < array.size(); i++) {
            if (i > 0) sb.append(separator);
            sb.append(array.getValue(i));
        }
        return sb.toString();
    }

    static String stampStyle(String seed) {
        int h = seed.hashCode();
        h = h ^ (h >>> 16);
        h = h * 0x45d9f3b;
        h = h ^ (h >>> 16);
        double angle = ((h & 0xFF) % 240) / 10.0 - 12.0;
        int mx = ((h >>> 8) & 0xFF) % 100;
        int my = ((h >>> 16) & 0xFF) % 100;
        return "--stamp-angle:" + String.format(java.util.Locale.US, "%.1f", angle) + "deg;--stamp-mx:" + mx + "%;--stamp-my:" + my + "%";
    }

    @TemplateExtension(namespace = "digest")
    static RawString searchIndex(Site site) {
        var json = new JsonObject(RoqPluginLunrTemplateExtension.searchIndex(site).toString());
        var posts = site.collections().get("digest-posts");
        if (posts != null) {
            for (var page : posts) {
                var sections = page.data().getJsonArray("sections");
                if (sections == null) continue;
                String pageUrl = page.url().absolute();
                for (int i = 0; i < sections.size(); i++) {
                    var section = sections.getJsonObject(i);
                    var articles = section.getJsonArray("articles");
                    if (articles == null) continue;
                    for (int j = 0; j < articles.size(); j++) {
                        var article = articles.getJsonObject(j);
                        String id = article.getString("id", "");
                        String title = article.getString("title", "");
                        if (id.isEmpty() || title.isEmpty()) continue;
                        var content = new StringBuilder();
                        String oneLiner = article.getString("one-liner", "");
                        if (!oneLiner.isEmpty()) content.append(oneLiner).append(" ");
                        var summary = article.getJsonObject("summary");
                        if (summary != null) {
                            String what = summary.getString("what", "");
                            String why = summary.getString("why", "");
                            String takeaway = summary.getString("takeaway", "");
                            if (!what.isEmpty()) content.append(what).append(" ");
                            if (!why.isEmpty()) content.append(why).append(" ");
                            if (!takeaway.isEmpty()) content.append(takeaway).append(" ");
                        }
                        var tags = article.getJsonArray("tags");
                        String postSlug = StringPaths.slugify(page.title(), false, false).toLowerCase();
                        String articleUrl = page.site().url("digest-posts", postSlug, id).absolute();
                        var entry = new JsonObject()
                                .put("title", page.title() + " - " + title)
                                .put("url", articleUrl)
                                .put("fragment", id)
                                .put("content", content.toString().trim())
                                .put("boost", 4);
                        if (tags != null) entry.put("tags", tags);
                        json.put(page.id() + "#" + id, entry);
                    }
                }
            }
        }
        return new RawString(json.toString());
    }

    static String seoTitle(Page page) {
        if (!(page instanceof DocumentPage)) return page.title();
        return seoTitle((DocumentPage) page);
    }

    static String seoTitle(DocumentPage page) {
        var articles = articlesByRating(page.data());
        String topOneLiner = "";
        for (var a : articles) {
            String oneLiner = a.getString("one-liner", "");
            if (!oneLiner.isEmpty() && !oneLiner.startsWith("Skipped")) {
                topOneLiner = oneLiner;
                break;
            }
        }
        String date = page.date().format(java.time.format.DateTimeFormatter.ofPattern("MMM d", java.util.Locale.US));
        String suffix = " | " + date;
        int maxHook = 60 - suffix.length();
        if (topOneLiner.length() > maxHook) {
            int cut = topOneLiner.lastIndexOf(' ', maxHook);
            if (cut > 20) topOneLiner = topOneLiner.substring(0, cut) + "...";
            else topOneLiner = topOneLiner.substring(0, maxHook) + "...";
        }
        return topOneLiner.isEmpty() ? page.title() : topOneLiner + suffix;
    }

    static RawString jsonLd(DocumentPage page) {
        var data = page.data();
        var articles = articlesByRating(data);
        String pageUrl = page.url().absolute();
        var items = new JsonArray();
        int position = 0;
        for (var article : articles) {
            position++;
            var item = new JsonObject()
                    .put("@type", "ListItem")
                    .put("position", position);
            var newsArticle = new JsonObject()
                    .put("@type", "NewsArticle")
                    .put("headline", article.getString("title", ""))
                    .put("datePublished", data.getString("date", ""));
            String oneLiner = article.getString("one-liner", "");
            if (!oneLiner.isEmpty()) newsArticle.put("description", oneLiner);
            String image = article.getString("image", "");
            if (!image.isEmpty()) newsArticle.put("image", image);
            String id = article.getString("id", "");
            if (!id.isEmpty()) {
                String postSlug = StringPaths.slugify(page.title(), false, false).toLowerCase();
                newsArticle.put("url", page.site().url("digest-posts", postSlug, id).absolute());
            }
            String source = article.getString("source", "");
            if (!source.isEmpty()) newsArticle.put("publisher", new JsonObject()
                    .put("@type", "Organization").put("name", source));
            item.put("item", newsArticle);
            items.add(item);
        }
        var ld = new JsonObject()
                .put("@context", "https://schema.org")
                .put("@type", "ItemList")
                .put("name", data.getString("title", ""))
                .put("itemListElement", items);
        return new RawString(ld.encodePrettily());
    }

    static DigestService digest(Page page) {
        return io.quarkus.arc.Arc.container().instance(DigestService.class).get();
    }

    static JsonObject findArticle(Page page) {
        if (page.data() == null) return null;
        return digest(page).findArticle(
                page.data().getString("post-date", ""),
                page.data().getString("article-id", ""));
    }

    static DocumentPage findPost(Page page) {
        if (page.data() == null) return null;
        return digest(page).findPost(page.data().getString("post-date", ""));
    }

    static JsonObject prevArticle(Page page) {
        if (page.data() == null) return null;
        return digest(page).prevArticle(
                page.data().getString("post-date", ""),
                page.data().getString("article-id", ""));
    }

    static JsonObject nextArticle(Page page) {
        if (page.data() == null) return null;
        return digest(page).nextArticle(
                page.data().getString("post-date", ""),
                page.data().getString("article-id", ""));
    }

    static int articleCount(Page page) {
        if (page.data() == null) return 0;
        return digest(page).articleCount(page.data().getString("post-date", ""));
    }

    static String articleSection(Page page) {
        if (page.data() == null) return "";
        return digest(page).findSection(
                page.data().getString("post-date", ""),
                page.data().getString("article-id", ""));
    }

    static RawString articleJsonLd(Page page) {
        var article = findArticle(page);
        if (article == null) return new RawString("{}");
        var ld = new JsonObject()
                .put("@context", "https://schema.org")
                .put("@type", "NewsArticle")
                .put("headline", article.getString("title", ""))
                .put("datePublished", page.data().getString("post-date", ""));
        String oneLiner = article.getString("one-liner", "");
        if (!oneLiner.isEmpty()) ld.put("description", oneLiner);
        String image = article.getString("image", "");
        if (!image.isEmpty()) ld.put("image", image);
        String source = article.getString("source", "");
        if (!source.isEmpty()) ld.put("publisher", new JsonObject()
                .put("@type", "Organization").put("name", source));
        return new RawString(ld.encodePrettily());
    }

    static List<JsonObject> articlesByRating(JsonObject postData) {
        var all = new ArrayList<JsonObject>();
        var sections = postData.getJsonArray("sections");
        if (sections == null) return all;
        for (int i = 0; i < sections.size(); i++) {
            var section = sections.getJsonObject(i);
            var name = section.getString("name", "");
            var articles = section.getJsonArray("articles");
            if (articles == null) continue;
            for (int j = 0; j < articles.size(); j++) {
                var article = articles.getJsonObject(j).copy();
                article.put("section", name);
                all.add(article);
            }
        }
        all.sort(Comparator.comparingInt((JsonObject a) -> a.getInteger("rating", 3)).reversed());
        return all;
    }
}
