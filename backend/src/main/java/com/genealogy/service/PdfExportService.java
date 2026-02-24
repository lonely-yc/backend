package com.genealogy.service;

import com.genealogy.entity.Event;
import com.genealogy.entity.Family;
import com.genealogy.entity.Person;
import com.genealogy.entity.Relation;
import com.genealogy.mapper.EventMapper;
import com.genealogy.mapper.FamilyMapper;
import com.genealogy.mapper.PersonMapper;
import com.genealogy.mapper.RelationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfExportService {

    private final TemplateEngine templateEngine;
    private final FamilyMapper familyMapper;
    private final PersonMapper personMapper;
    private final RelationMapper relationMapper;
    private final EventMapper eventMapper;

    /**
     * 导出欧式族谱 PDF
     */
    public byte[] exportOuStyle(Long familyId) throws Exception {
        return exportPdf(familyId, "ou-style");
    }

    /**
     * 导出苏式族谱 PDF
     */
    public byte[] exportSuStyle(Long familyId) throws Exception {
        return exportPdf(familyId, "su-style");
    }

    /**
     * 通用 PDF 导出方法
     */
    private byte[] exportPdf(Long familyId, String template) throws Exception {
        // 获取家族信息
        Family family = familyMapper.selectById(familyId);
        if (family == null) {
            throw new RuntimeException("家族不存在");
        }

        // 获取成员列表
        List<Person> persons = personMapper.selectList(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Person>()
                .eq(Person::getFamilyId, familyId)
                .eq(Person::getDeleted, 0)
                .orderByAsc(Person::getGeneration)
                .orderByAsc(Person::getName)
        );

        // 获取关系列表
        List<Relation> relations = relationMapper.selectList(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Relation>()
                .eq(Relation::getDeleted, 0)
        );

        // 获取事件列表
        List<Event> events = eventMapper.selectList(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Event>()
                .eq(Event::getDeleted, 0)
        );

        // 构建数据模型
        Map<String, Object> model = buildModel(family, persons, relations, events, template);

        // 渲染 HTML
        String html = renderHtml(template, model);

        // 生成 PDF
        return generatePdf(html);
    }

    /**
     * 构建数据模型
     */
    private Map<String, Object> buildModel(Family family, List<Person> persons,
                                           List<Relation> relations, List<Event> events, String template) {
        Map<String, Object> model = new HashMap<>();

        // 家族信息
        model.put("family", family);

        // 统计信息
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPersons", persons.size());
        stats.put("totalGenerations", persons.stream()
            .mapToInt(Person::getGeneration).max().orElse(0));
        stats.put("maleCount", persons.stream().filter(p -> "male".equals(p.getGender())).count());
        stats.put("femaleCount", persons.stream().filter(p -> "female".equals(p.getGender())).count());
        model.put("stats", stats);

        // 构建世系数据
        List<Map<String, Object>> generations = buildGenerations(persons, relations, template);
        model.put("generations", generations);

        // 构建表格数据
        if ("ou-style".equals(template)) {
            model.put("ouTables", buildOuTables(persons, relations));
        } else {
            model.put("suTables", buildSuTables(persons, relations));
        }

        // 人物列表（带配偶信息）
        List<Map<String, Object>> personList = buildPersonList(persons, relations);
        model.put("persons", personList);

        // 迁徙数据
        List<Map<String, Object>> migrationData = buildMigrationData(persons, events);
        model.put("migrationData", migrationData);

        // 目录
        List<Map<String, Object>> toc = buildToc(generations, template);
        model.put("toc", toc);

        return model;
    }

    /**
     * 构建世系数据
     */
    private List<Map<String, Object>> buildGenerations(List<Person> persons, List<Relation> relations, String template) {
        // 按世代分组
        Map<Integer, List<Person>> byGeneration = persons.stream()
            .collect(Collectors.groupingBy(Person::getGeneration));

        int maxGen = byGeneration.keySet().stream().max(Integer::compareTo).orElse(1);
        int minGen = byGeneration.keySet().stream().min(Integer::compareTo).orElse(1);

        List<Map<String, Object>> generations = new ArrayList<>();
        int page = 3; // 从第3页开始（封面、凡例/目录）

        for (int gen = minGen; gen <= maxGen; gen += 5) {
            final int endGen = Math.min(gen + 4, maxGen);
            int finalGen = gen;
            List<Person> genPersons = persons.stream()
                .filter(p -> p.getGeneration() >= finalGen && p.getGeneration() <= endGen)
                .sorted(Comparator.comparing(Person::getGeneration)
                    .thenComparing(Person::getName))
                .collect(Collectors.toList());

            Map<String, Object> genData = new HashMap<>();
            genData.put("generation", gen);
            genData.put("endGeneration", endGen);
            genData.put("personCount", genPersons.size());
            genData.put("page", page++);
            genData.put("rows", buildTreeRows(genPersons, relations, template));

            generations.add(genData);
        }

        return generations;
    }

    /**
     * 构建树形结构行
     */
    private List<List<Map<String, Object>>> buildTreeRows(List<Person> persons, List<Relation> relations, String template) {
        // 构建父子关系映射
        Map<Long, List<Long>> childrenMap = new HashMap<>();
        relations.stream()
            .filter(r -> "parent-child".equals(r.getType()))
            .forEach(r -> {
                childrenMap.computeIfAbsent(r.getFromId(), k -> new ArrayList<>()).add(r.getToId());
            });

        // 构建配偶映射
        Map<Long, Long> spouseMap = new HashMap<>();
        relations.stream()
            .filter(r -> "spouse".equals(r.getType()))
            .forEach(r -> {
                spouseMap.put(r.getFromId(), r.getToId());
                spouseMap.put(r.getToId(), r.getFromId());
            });

        // 找出根节点（没有父节点的人物）
        Set<Long> allChildIds = relations.stream()
            .filter(r -> "parent-child".equals(r.getType()))
            .map(Relation::getToId)
            .collect(Collectors.toSet());

        List<Person> rootPersons = persons.stream()
            .filter(p -> !allChildIds.contains(p.getId()))
            .collect(Collectors.toList());

        if (rootPersons.isEmpty() && !persons.isEmpty()) {
            rootPersons.add(persons.get(0));
        }

        // 递归构建树
        List<List<Map<String, Object>>> rows = new ArrayList<>();
        for (Person root : rootPersons) {
            rows.add(buildPersonTree(root, persons, childrenMap, spouseMap, 0, template));
        }

        return rows;
    }

    /**
     * 递归构建人物树
     */
    private List<Map<String, Object>> buildPersonTree(Person person, List<Person> persons,
                                                       Map<Long, List<Long>> childrenMap,
                                                       Map<Long, Long> spouseMap,
                                                       int level, String template) {
        List<Map<String, Object>> row = new ArrayList<>();

        Map<String, Object> personData = new HashMap<>();
        personData.put("id", person.getId());
        personData.put("name", person.getName());
        personData.put("gender", person.getGender());
        personData.put("generation", person.getGeneration());
        personData.put("birthPlace", person.getBirthPlace());
        personData.put("birthDate", person.getBirthDate());

        // 配偶信息
        Long spouseId = spouseMap.get(person.getId());
        if (spouseId != null) {
            Person spouse = persons.stream().filter(p -> p.getId().equals(spouseId)).findFirst().orElse(null);
            if (spouse != null) {
                personData.put("spouse", spouse.getName());
            }
        }

        // 子女信息
        List<Long> childIds = childrenMap.getOrDefault(person.getId(), Collections.emptyList());
        if (!childIds.isEmpty()) {
            List<Person> children = persons.stream()
                .filter(p -> childIds.contains(p.getId()))
                .sorted(Comparator.comparing(Person::getGeneration).thenComparing(Person::getName))
                .collect(Collectors.toList());
            personData.put("children", children);
        }

        row.add(personData);

        return row;
    }

    /**
     * 构建欧式表格
     */
    private List<Map<String, Object>> buildOuTables(List<Person> persons, List<Relation> relations) {
        List<Map<String, Object>> tables = new ArrayList<>();

        // 构建关系映射
        Map<Long, List<Long>> childrenMap = new HashMap<>();
        relations.stream()
            .filter(r -> "parent-child".equals(r.getType()))
            .forEach(r -> {
                childrenMap.computeIfAbsent(r.getFromId(), k -> new ArrayList<>()).add(r.getToId());
            });

        Map<Long, Long> spouseMap = new HashMap<>();
        relations.stream()
            .filter(r -> "spouse".equals(r.getType()))
            .forEach(r -> {
                spouseMap.put(r.getFromId(), r.getToId());
                spouseMap.put(r.getToId(), r.getFromId());
            });

        int maxGen = persons.stream().mapToInt(Person::getGeneration).max().orElse(1);
        int page = 1;

        for (int gen = 1; gen <= maxGen; gen += 5) {
            int endGen = Math.min(gen + 4, maxGen);
            int finalGen = gen;
            List<Person> genPersons = persons.stream()
                .filter(p -> p.getGeneration() >= finalGen && p.getGeneration() <= endGen)
                .collect(Collectors.toList());

            Map<String, Object> table = new HashMap<>();
            table.put("startGen", gen);
            table.put("endGeneration", endGen);
            table.put("personCount", genPersons.size());
            table.put("page", page++);
            table.put("rows", buildOuTableRows(genPersons, childrenMap, spouseMap));

            tables.add(table);
        }

        return tables;
    }

    /**
     * 构建欧式表格行
     */
    private List<List<List<Map<String, Object>>>> buildOuTableRows(List<Person> persons,
                                                                     Map<Long, List<Long>> childrenMap,
                                                                     Map<Long, Long> spouseMap) {
        List<List<List<Map<String, Object>>>> allRows = new ArrayList<>();

        for (Person person : persons) {
            List<Map<String, Object>> row = new ArrayList<>();

            // 世代
            Map<String, Object> genCell = new HashMap<>();
            genCell.put("text", "第" + person.getGeneration() + "世");
            genCell.put("className", "generation-col");
            row.add(genCell);

            // 姓名
            Map<String, Object> nameCell = new HashMap<>();
            nameCell.put("text", person.getName());
            nameCell.put("className", "name-cell line-vertical-left");
            row.add(nameCell);

            // 配偶
            Map<String, Object> spouseCell = new HashMap<>();
            Long spouseId = spouseMap.get(person.getId());
            if (spouseId != null) {
                Person spouse = persons.stream().filter(p -> p.getId().equals(spouseId)).findFirst().orElse(null);
                if (spouse != null) {
                    spouseCell.put("text", "配 " + spouse.getName());
                }
            }
            spouseCell.put("className", "spouse-cell line-vertical-right");
            row.add(spouseCell);

            // 包装成行列表再添加
            List<List<Map<String, Object>>> rowWrapper = new ArrayList<>();
            rowWrapper.add(row);
            allRows.add(rowWrapper);
        }

        return allRows;
    }

    /**
     * 构建苏式表格
     */
    private List<Map<String, Object>> buildSuTables(List<Person> persons, List<Relation> relations) {
        // 类似欧式表格，但样式不同
        return buildOuTables(persons, relations);
    }

    /**
     * 构建人物列表
     */
    private List<Map<String, Object>> buildPersonList(List<Person> persons, List<Relation> relations) {
        Map<Long, Long> spouseMap = new HashMap<>();
        relations.stream()
            .filter(r -> "spouse".equals(r.getType()))
            .forEach(r -> {
                spouseMap.put(r.getFromId(), r.getToId());
                spouseMap.put(r.getToId(), r.getFromId());
            });

        return persons.stream().map(p -> {
            Map<String, Object> data = new HashMap<>();
            data.put("id", p.getId());
            data.put("name", p.getName());
            data.put("gender", p.getGender());
            data.put("generation", p.getGeneration());
            data.put("birthDate", p.getBirthDate());
            data.put("birthPlace", p.getBirthPlace());

            Long spouseId = spouseMap.get(p.getId());
            if (spouseId != null) {
                Person spouse = persons.stream().filter(person -> person.getId().equals(spouseId)).findFirst().orElse(null);
                if (spouse != null) {
                    data.put("spouseName", spouse.getName());
                }
            }

            return data;
        }).collect(Collectors.toList());
    }

    /**
     * 构建迁徙数据
     */
    private List<Map<String, Object>> buildMigrationData(List<Person> persons, List<Event> events) {
        // 筛选有地理位置的迁徙/定居事件
        List<Event> migrationEvents = events.stream()
            .filter(e -> ("migration".equals(e.getType()) || "residence".equals(e.getType())))
            .filter(e -> e.getLatitude() != null && e.getLongitude() != null)
            .sorted(Comparator.comparing(Event::getEventDate))
            .collect(Collectors.toList());

        Map<Long, Person> personMap = persons.stream()
            .collect(Collectors.toMap(Person::getId, p -> p));

        return migrationEvents.stream().map(e -> {
            Person person = personMap.get(e.getPersonId());
            Map<String, Object> data = new HashMap<>();
            data.put("generation", person != null ? person.getGeneration() : 0);
            data.put("personName", person != null ? person.getName() : "未知");
            data.put("eventDate", e.getEventDate());
            data.put("type", "migration".equals(e.getType()) ? "迁徙" : "定居");
            data.put("location", e.getLocation());
            data.put("events", Collections.singletonList(data));
            return data;
        }).collect(Collectors.toList());
    }

    /**
     * 构建目录
     */
    private List<Map<String, Object>> buildToc(List<Map<String, Object>> generations, String template) {
        List<Map<String, Object>> toc = new ArrayList<>();

        Map<String, Object> item1 = new HashMap<>();
        item1.put("title", "世系总图");
        item1.put("page", 3);
        toc.add(item1);

        Map<String, Object> item2 = new HashMap<>();
        item2.put("title", template.equals("ou-style") ? "欧式世系表" : "苏式世系表");
        item2.put("page", 4);
        toc.add(item2);

        Map<String, Object> item3 = new HashMap<>();
        item3.put("title", "人物名录");
        item3.put("page", generations.size() + 4);
        toc.add(item3);

        return toc;
    }

    /**
     * 渲染 HTML
     */
    private String renderHtml(String template, Map<String, Object> model) {
        Context context = new Context();
        model.forEach(context::setVariable);
        return templateEngine.process("pdf/" + template, context);
    }

    /**
     * 生成 PDF
     */
    private byte[] generatePdf(String html) throws Exception {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(outputStream);
            return outputStream.toByteArray();
        }
    }
}
