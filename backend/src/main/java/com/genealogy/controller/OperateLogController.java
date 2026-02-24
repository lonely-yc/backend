package com.genealogy.controller;

import com.genealogy.dto.OperateLogDTO;
import com.genealogy.dto.R;
import com.genealogy.service.OperateLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 操作日志控制器
 */
@RestController
@RequestMapping("/api/operate-log")
@RequiredArgsConstructor
public class OperateLogController {

    private final OperateLogService operateLogService;

    /**
     * 分页查询操作日志
     */
    @PostMapping("/page")
    public R<OperateLogDTO.PageResult> page(@RequestBody OperateLogDTO.QueryParams params) {
        return R.ok(operateLogService.pageQuery(params));
    }

    /**
     * 查询某人物的操作历史
     */
    @GetMapping("/person/{personId}")
    public R<List<OperateLogDTO>> byPerson(@PathVariable Long personId) {
        return R.ok(operateLogService.getByTargetId(personId));
    }

    /**
     * 查询某家族的操作日志
     */
    @GetMapping("/family/{familyId}")
    public R<List<OperateLogDTO>> byFamily(@PathVariable Long familyId) {
        return R.ok(operateLogService.getByFamilyId(familyId));
    }

    /**
     * 解析日志详情
     */
    @GetMapping("/{id}/detail")
    public R<OperateLogDTO> getDetail(@PathVariable Long id) {
        OperateLogDTO log = operateLogService.findById(id);
        if (log == null) {
            return R.fail("日志不存在");
        }
        // 解析详情JSON并设置到detail字段（DTO的detail字段是String，这里用额外字段返回）
        return R.ok(log);
    }
}
