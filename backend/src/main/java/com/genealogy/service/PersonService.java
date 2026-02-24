package com.genealogy.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.genealogy.dto.TreeNodeDTO;
import com.genealogy.entity.Person;
import com.genealogy.entity.Relation;
import com.genealogy.mapper.PersonMapper;
import com.genealogy.mapper.RelationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PersonService extends ServiceImpl<PersonMapper, Person> {

    private final RelationMapper relationMapper;

    public List<Person> search(String keyword, Long familyId) {
        LambdaQueryWrapper<Person> qw = new LambdaQueryWrapper<>();
        if (familyId != null) {
            qw.eq(Person::getFamilyId, familyId);
        }
        if (keyword != null && !keyword.isBlank()) {
            qw.like(Person::getName, keyword);
        }
        qw.orderByAsc(Person::getGeneration).orderByAsc(Person::getName);
        return list(qw);
    }

    public TreeNodeDTO buildTree(Long familyId) {
        LambdaQueryWrapper<Person> pqw = new LambdaQueryWrapper<>();
        if (familyId != null) {
            pqw.eq(Person::getFamilyId, familyId);
        }
        List<Person> allPersons = list(pqw);
        List<Relation> allRelations = relationMapper.selectList(new LambdaQueryWrapper<>());

        if (allPersons.isEmpty()) return null;

        Set<Long> personIds = allPersons.stream().map(Person::getId).collect(Collectors.toSet());

        Map<Long, TreeNodeDTO> nodeMap = new HashMap<>();
        for (Person p : allPersons) {
            TreeNodeDTO node = new TreeNodeDTO();
            node.setId(p.getId());
            node.setName(p.getName());
            node.setGender(p.getGender());
            node.setGeneration(p.getGeneration());
            node.setBirthDate(p.getBirthDate());
            node.setDeathDate(p.getDeathDate());
            node.setBirthPlace(p.getBirthPlace());
            node.setBio(p.getBio());
            node.setAvatarUrl(p.getAvatarUrl());
            node.setIsStarred(p.getIsStarred());
            node.setSpouses(new ArrayList<>());
            node.setChildren(new ArrayList<>());
            nodeMap.put(p.getId(), node);
        }

        Map<Long, Long> childOf = new HashMap<>();
        Set<Long> spouseIds = new HashSet<>();

        for (Relation r : allRelations) {
            if (!personIds.contains(r.getFromId()) || !personIds.contains(r.getToId())) continue;
            if ("spouse".equals(r.getType())) {
                TreeNodeDTO from = nodeMap.get(r.getFromId());
                TreeNodeDTO to = nodeMap.get(r.getToId());
                if (from != null && to != null) {
                    from.getSpouses().add(to);
                    spouseIds.add(r.getToId());
                }
            } else {
                childOf.put(r.getToId(), r.getFromId());
            }
        }

        for (Person p : allPersons) {
            Long parentId = childOf.get(p.getId());
            if (parentId != null && nodeMap.containsKey(parentId)) {
                nodeMap.get(parentId).getChildren().add(nodeMap.get(p.getId()));
            }
        }

        List<TreeNodeDTO> roots = allPersons.stream()
                .filter(p -> !childOf.containsKey(p.getId()) && !spouseIds.contains(p.getId()))
                .map(p -> nodeMap.get(p.getId()))
                .collect(Collectors.toList());

        if (roots.isEmpty()) {
            roots = allPersons.stream()
                    .filter(p -> !childOf.containsKey(p.getId()))
                    .map(p -> nodeMap.get(p.getId()))
                    .collect(Collectors.toList());
        }

        if (roots.size() == 1) {
            return roots.get(0);
        }

        TreeNodeDTO virtualRoot = new TreeNodeDTO();
        virtualRoot.setId(0L);
        virtualRoot.setName("家族");
        virtualRoot.setGender("male");
        virtualRoot.setGeneration(0);
        virtualRoot.setSpouses(new ArrayList<>());
        virtualRoot.setChildren(roots);
        return virtualRoot;
    }

    public Map<String, Object> stats(Long familyId) {
        LambdaQueryWrapper<Person> pqw = new LambdaQueryWrapper<>();
        if (familyId != null) {
            pqw.eq(Person::getFamilyId, familyId);
        }
        List<Person> all = list(pqw);
        List<Relation> rels = relationMapper.selectList(new LambdaQueryWrapper<>());

        Map<String, Object> result = new HashMap<>();
        result.put("total", all.size());
        result.put("maxGeneration", all.stream().mapToInt(Person::getGeneration).max().orElse(0));
        result.put("maleCount", all.stream().filter(p -> "male".equals(p.getGender())).count());
        result.put("femaleCount", all.stream().filter(p -> "female".equals(p.getGender())).count());
        result.put("starredCount", all.stream().filter(p -> Boolean.TRUE.equals(p.getIsStarred())).count());

        Set<Long> personIds = all.stream().map(Person::getId).collect(Collectors.toSet());
        result.put("spouseCount", rels.stream()
                .filter(r -> "spouse".equals(r.getType()) && personIds.contains(r.getFromId()))
                .count());

        Map<Integer, Long> genDist = all.stream()
                .collect(Collectors.groupingBy(Person::getGeneration, Collectors.counting()));
        result.put("generationDistribution", genDist);

        return result;
    }
}
