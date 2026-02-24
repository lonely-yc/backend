package com.genealogy.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_event")
public class Event {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long personId;

    /** birth / death / marriage / migration / achievement / residence / other */
    private String type;

    private String title;

    private String eventDate;

    private String description;

    /** 地理位置信息 */
    private String location;      // 地点名称，如：浙江省杭州市

    private Double latitude;      // 纬度

    private Double longitude;     // 经度

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
