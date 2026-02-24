package com.genealogy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

/**
 * 族谱树节点 — 用于前端 G6 渲染
 */
@Data
public class TreeNodeDTO {

    private Long id;
    private String name;
    private String gender;
    private Integer generation;
    private String birthDate;
    private String deathDate;
    private String birthPlace;
    private String bio;
    private String avatarUrl;
    private Boolean isStarred;

    /** 配偶列表 — 强制 JSON 字段名为 _spouses */
    @JsonProperty("_spouses")
    private List<TreeNodeDTO> spouses;

    /** 子节点 */
    private List<TreeNodeDTO> children;
}
