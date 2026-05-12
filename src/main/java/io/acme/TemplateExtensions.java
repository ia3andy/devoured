package io.acme;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import io.quarkiverse.roq.frontmatter.runtime.model.DocumentPage;
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
