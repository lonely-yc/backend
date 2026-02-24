package com.genealogy.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.dto.R;
import com.genealogy.dto.RelationDTO;
import com.genealogy.entity.OperateLog;
import com.genealogy.entity.Person;
import com.genealogy.entity.Relation;
import com.genealogy.service.OperateLogService;
import com.genealogy.service.PersonService;
import com.genealogy.service.RelationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/relation")
@RequiredArgsConstructor
@Slf4j
public class RelationController {

    private final RelationService relationService;
    private final PersonService personService;
    private final OperateLogService operateLogService;
    private final ObjectMapper objectMapper;

    /** 查询全部关系 */
    @GetMapping("/list")
    public R<List<Relation>> list() {
        return R.ok(relationService.list());
    }

    /** 查询某人的关系 */
    @GetMapping("/person/{personId}")
    public R<List<Relation>> byPerson(@PathVariable Long personId) {
        return R.ok(relationService.findByPersonId(personId));
    }

    /** 新增关系 */
    @PostMapping
    public R<Relation> add(@Valid @RequestBody RelationDTO dto, HttpServletRequest request) {
        Relation entity = new Relation();
        BeanUtils.copyProperties(dto, entity);
        relationService.save(entity);

        // 记录日志
        try {
            Person fromPerson = personService.getById(dto.getFromId());
            Person toPerson = personService.getById(dto.getToId());

            Map<String, Object> detail = new HashMap<>();
            detail.put("fromId", dto.getFromId());
            detail.put("fromName", fromPerson != null ? fromPerson.getName() : "");
            detail.put("toId", dto.getToId());
            detail.put("toName", toPerson != null ? toPerson.getName() : "");
            detail.put("type", dto.getType());
            detail.put("typeDesc", getRelationTypeDesc(dto.getType()));

            Long familyId = fromPerson != null ? fromPerson.getFamilyId() : null;
            operateLogService.log(
                    OperateLog.OperateType.RELATION_ADD,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    entity.getId(),
                    (fromPerson != null ? fromPerson.getName() : "") + " - " + (toPerson != null ? toPerson.getName() : ""),
                    "RELATION",
                    familyId,
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok(entity);
    }

    private String getRelationTypeDesc(String type) {
        switch (type) {
            case "spouse": return "配偶关系";
            case "parent-child": return "亲子关系";
            case "adopted": return "养子女关系";
            default: return type;
        }
    }

    /** 删除关系 */
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        Relation relation = relationService.getById(id);
        if (relation == null) return R.fail("关系不存在");

        // 记录删除前的关系信息
        Person fromPerson = personService.getById(relation.getFromId());
        Person toPerson = personService.getById(relation.getToId());

        Map<String, Object> detail = new HashMap<>();
        detail.put("fromId", relation.getFromId());
        detail.put("fromName", fromPerson != null ? fromPerson.getName() : "");
        detail.put("toId", relation.getToId());
        detail.put("toName", toPerson != null ? toPerson.getName() : "");
        detail.put("type", relation.getType());
        detail.put("typeDesc", getRelationTypeDesc(relation.getType()));

        Long familyId = fromPerson != null ? fromPerson.getFamilyId() : null;

        relationService.removeById(id);

        // 记录日志
        try {
            operateLogService.log(
                    OperateLog.OperateType.RELATION_DELETE,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    id,
                    (fromPerson != null ? fromPerson.getName() : "") + " - " + (toPerson != null ? toPerson.getName() : ""),
                    "RELATION",
                    familyId,
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok();
    }
}
