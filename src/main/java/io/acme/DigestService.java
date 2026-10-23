package io.acme;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import io.quarkus.arc.Unremovable;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

import io.quarkiverse.roq.frontmatter.runtime.model.DocumentPage;
import io.quarkiverse.roq.frontmatter.runtime.model.Site;
import io.vertx.core.json.JsonObject;

@Unremovable
@Singleton
public class DigestService {

    @Inject
    Site site;

    private final Map<String, DocumentPage> postCache = new ConcurrentHashMap<>();
    private final Map<String, LinkedHashMap<String, JsonObject>> articleCache = new ConcurrentHashMap<>();
    private final Map<String, Map<String, String>> sectionCache = new ConcurrentHashMap<>();

    public DocumentPage findPost(String postDate) {
        return postCache.computeIfAbsent(postDate, d -> {
            var posts = site.collections().get("digest-posts");
            if (posts == null) return null;
            for (var post : posts) {
                if (post.date().format(DateTimeFormatter.ISO_LOCAL_DATE).equals(d))
                    return post;
            }
            return null;
        });
    }

    private void ensureCaches(String postDate) {
        if (articleCache.containsKey(postDate)) return;
        var articles = new LinkedHashMap<String, JsonObject>();
        var sections = new ConcurrentHashMap<String, String>();
        var post = findPost(postDate);
        if (post != null) {
            var postSections = post.data().getJsonArray("sections");
            if (postSections != null) {
                for (int i = 0; i < postSections.size(); i++) {
                    var section = postSections.getJsonObject(i);
                    var sectionName = section.getString("name", "");
                    var sectionArticles = section.getJsonArray("articles");
                    if (sectionArticles == null) continue;
                    for (int j = 0; j < sectionArticles.size(); j++) {
                        var a = sectionArticles.getJsonObject(j);
                        var id = a.getString("id", "");
                        articles.put(id, a);
                        sections.put(id, sectionName);
                    }
                }
            }
        }
        articleCache.put(postDate, articles);
        sectionCache.put(postDate, sections);
    }

    public JsonObject findArticle(String postDate, String articleId) {
        ensureCaches(postDate);
        return articleCache.get(postDate).get(articleId);
    }

    public String findSection(String postDate, String articleId) {
        ensureCaches(postDate);
        return sectionCache.get(postDate).getOrDefault(articleId, "");
    }

    public JsonObject prevArticle(String postDate, String articleId) {
        return adjacentArticle(postDate, articleId, -1);
    }

    public JsonObject nextArticle(String postDate, String articleId) {
        return adjacentArticle(postDate, articleId, 1);
    }

    public int articleCount(String postDate) {
        ensureCaches(postDate);
        return articleCache.get(postDate).size();
    }

    private JsonObject adjacentArticle(String postDate, String articleId, int offset) {
        ensureCaches(postDate);
        var ids = new ArrayList<>(articleCache.get(postDate).keySet());
        int idx = ids.indexOf(articleId);
        if (idx < 0) return null;
        int target = idx + offset;
        if (target < 0 || target >= ids.size()) return null;
        return articleCache.get(postDate).get(ids.get(target));
    }
}
