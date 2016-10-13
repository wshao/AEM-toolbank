package com.powersquare.core.servlets;

import com.day.cq.search.PredicateGroup;
import com.day.cq.search.Query;
import com.day.cq.search.QueryBuilder;
import com.day.cq.search.result.SearchResult;
import org.apache.felix.scr.annotations.Reference;
import org.apache.felix.scr.annotations.sling.SlingServlet;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


import javax.jcr.*;
import javax.servlet.ServletException;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * A Content Modification Servlet to modify the content page property.
 * <p/>
 * It takes following parameters:
 * <p/>
 * basePath: the root of the content page to have this modification
 * propertyName: the name of propertyName
 * originalValue: the original value of the property, it can be the first part of the value too
 * targetValue: it will be used to replaced the originalValue
 */
@SlingServlet(
        paths = "/bin/content/modification",
        methods = {"GET", "POST"}
)
public class ContentModifyServlet extends SlingAllMethodsServlet {

    private final Logger logger = LoggerFactory.getLogger(getClass());

    @Reference
    private QueryBuilder queryBuilder;

    private String basePath;

    private String propertyName;

    private String originalValue;

    private String targetValue;

    private Session session;

    /**
     * Maximize the number of results returned on the page to simplify the script implementation here
     * However, it can be extended to support scanning each search result page
     */
    private static long MAX_HIT_PER_PAGE = 100000;

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response) throws ServletException, IOException {

        basePath = request.getParameter("basePath");
        propertyName = request.getParameter("propertyName");
        originalValue = request.getParameter("original");
        targetValue = request.getParameter("target");
        PrintWriter writer = response.getWriter();
        printSetting(writer);

        if (basePath != null && propertyName != null &&
                originalValue != null && targetValue != null) {
            session = request.getResourceResolver().adaptTo(Session.class);
            SearchResult searchResult = this.searchResource(writer);

            writer.println("Total number of nodes found: " + searchResult.getTotalMatches());
            writer.println("+Start Updating+");
            writer.flush();

            updateContent(searchResult, writer);

            writer.close();
        } else {
            writer.println("Missing Parameters Error!");
            writer.close();
        }


    }

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response) throws ServletException, IOException {
        this.doPost(request, response);

    }

    private void printSetting(PrintWriter writer) {
        writer.println("=========================");
        writer.println("Content Modification Servlet");
        writer.println("base path: " + basePath);
        writer.println("property name: " + propertyName);
        writer.println("original value " + originalValue);
        writer.println("target value: " + targetValue);
        writer.println("=========================");
        writer.flush();
    }

    private SearchResult searchResource(PrintWriter writer) {
        Map<String, String> map = new HashMap();
        map.put("path", basePath);
        map.put("property", propertyName);
        map.put("property.value", originalValue + "%");
        map.put("property.operation", "like");
        Query query = queryBuilder.createQuery(PredicateGroup.create(map), session);
        query.setHitsPerPage(MAX_HIT_PER_PAGE);
        SearchResult result = query.getResult();
        return result;
    }


    private void updateContent(SearchResult result, PrintWriter writer) {

        Iterator<Node> iterator = result.getNodes();

        while (iterator.hasNext()) {
            try {
                Node node = iterator.next();
                Property nodeProperty = node.getProperty(propertyName);
                String value = nodeProperty.getString();

                if (value.contains(originalValue)) {
                    writer.println("Node found: " + node.getPath());
                    writer.println("Original Value: " + value);

                    value = value.replace(originalValue, targetValue);
                    node.setProperty(propertyName, value);
                    writer.println("New value is : " + value);
                    writer.println("++++++++++");
                    writer.flush();
                    session.save();
                }
            } catch (RepositoryException e) {
                logger.error("Error while modifying content");

            }
        }

    }

}
