package com.genealogy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class EventDTO {

    private Long id;

    @NotNull(message = "人物ID不能为空")
    private Long personId;

    private String type;

    @NotBlank(message = "事件标题不能为空")
    private String title;

    private String eventDate;

    private String description;

    /** 地理位置信息 */
    private String location;      // 地点名称，如：浙江省杭州市

    private Double latitude;      // 纬度

    private Double longitude;     // 经度
}
