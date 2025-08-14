from PIL import Image, ImageDraw, ImageFont
from scipy.spatial.distance import squareform, pdist

class DrawImage:
    @staticmethod
    def draw_translations_on_image(image_path, result, output_path="translated_overlay.jpg", font_path=None):
        image = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(image)

        #center calculation 
        centers = []
        boxes = []
        for item in result:
            box = item["box"]
            boxes.append(box)
            x_coords = [pt[0] for pt in box]
            y_coords = [pt[1] for pt in box]
            center_x = sum(x_coords) / 4
            center_y = sum(y_coords) / 4
            centers.append((center_x, center_y))

        # Tính matrix
        distances = squareform(pdist([(c[0], c[1]) for c in centers]))

        # group coordinate
        threshold = 50
        groups = []
        used = [False] * len(boxes)

        for i in range(len(boxes)):
            if used[i]:
                continue
            current_group = [i]
            used[i] = True
            for j in range(i + 1, len(boxes)):
                if not used[j] and distances[i][j] < threshold:
                    current_group.append(j)
                    used[j] = True
            if current_group:
                groups.append(current_group)

        try:
            font = ImageFont.truetype(font_path or "Arial.ttf", size=16)
        except:
            font = ImageFont.load_default()

        print("result", result)
        print("groups", groups)
        print("font", font)

        for group in groups:
            all_boxes = [boxes[i] for i in group]
            x_coords_group = [pt[0] for box in all_boxes for pt in box]
            y_coords_group = [pt[1] for box in all_boxes for pt in box]
            x_min_group, x_max_group = min(x_coords_group) - 10, max(x_coords_group) + 10
            y_min_group, y_max_group = min(y_coords_group) - 10, max(y_coords_group) + 10
            draw.rectangle([x_min_group, y_min_group, x_max_group, y_max_group], fill="white")

        #draw text 
        for item in result:
            box = item["box"]
            translated_text = item["vi"]
            print("translated_text", translated_text)
            x_coords = [pt[0] for pt in box]
            y_coords = [pt[1] for pt in box]
            x_min, x_max = min(x_coords), max(x_coords)
            y_min, y_max = min(y_coords), max(y_coords)

            draw.text((x_min, y_min), translated_text, fill="black", font=font)

        image.save(output_path)