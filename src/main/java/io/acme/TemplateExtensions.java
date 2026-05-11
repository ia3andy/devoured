package io.acme;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import io.quarkus.qute.TemplateExtension;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

@TemplateExtension
public class TemplateExtensions {

    static JsonArray sortByRatingDesc(JsonArray articles) {
        var list = new ArrayList<JsonObject>();
        for (int i = 0; i < articles.size(); i++) {
            list.add(articles.getJsonObject(i));
        }
        list.sort(Comparator.comparingInt((JsonObject a) -> a.getInteger("rating", 3)).reversed());
        var sorted = new JsonArray();
        list.forEach(sorted::add);
        return sorted;
    }
}
