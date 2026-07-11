import argparse
import email
import csv
import itertools
import sys
from bs4 import BeautifulSoup

def main():
    parser = argparse.ArgumentParser(description="Scrape course mappings from an MHTML file and output to CSV.")

    parser.add_argument("-m", "--mhtml", required=True, type=str, help="Path to the input MHTML file.")
    parser.add_argument("-c", "--csv", type=str, help="Path to the output CSV file.")

    # 3. Parse input arguments
    args = parser.parse_args()

    mhtml_file = args.mhtml
    csv_file = args.csv if args.csv else 'output.csv'
    scrape_mappings(mhtml_file, csv_file)

def scrape_mappings(mhtml_path, csv_path):
    print(f"Reading MHTML file from: {mhtml_path}...")
    try:
        with open(mhtml_path, 'r', encoding='utf-8', errors='ignore') as f:
            msg = email.message_from_file(f)
    except Exception as e:
        print(f"Error reading MHTML file: {e}")
        sys.exit(1)
        
    print("Finding the HTML part containing the course mappings table...")
    # Walk through parts to find the main HTML table part (Part 32 or any part of type text/html with large content)
    html_content = None
    for idx, part in enumerate(msg.walk()):
        content_type = part.get_content_type()
        if content_type == 'text/html':
            payload = part.get_payload(decode=True)
            if payload and len(payload) > 1000000:  # The main data part is extremely large (~16MB)
                html_content = payload.decode('utf-8', errors='ignore')
                print(f"Found main table in Part {idx} ({len(payload)} bytes).")
                break
                
    if not html_content:
        print("Error: Could not locate the main HTML table part in the MHTML file.")
        sys.exit(1)
        
    print("Parsing HTML with BeautifulSoup (using lxml parser)...")
    soup = BeautifulSoup(html_content, 'lxml')
    
    # Locate all table rows for mapping
    # Rows have IDs like: trN_EXSP_DRVD$0_row1, trN_EXSP_DRVD$0_row2, etc.
    rows = soup.find_all('tr', id=lambda x: x and x.startswith('trN_EXSP_DRVD$0_row'))
    total_rows = len(rows)
    print(f"Located {total_rows} course mapping rows in the HTML table.")
    
    headers = [
        'Faculty', 
        'Partner University', 
        'PU Course', 
        'PU Course Title', 
        'PU Course Units', 
        'NUS Course', 
        'NUS Course Title', 
        'NUS Course Units', 
        'Pre Approved'
    ]
    
    print(f"Writing parsed data to: {csv_path}...")
    try:
        with open(csv_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            
            written_count = 0
            for row in rows:
                tds = row.find_all('td')
                if len(tds) < 15:
                    # Skip invalid/header rows just in case
                    continue
                
                # Helper to extract and clean cell text
                def get_clean_text(td_element):
                    t = td_element.get_text(strip=True)
                    # Replace non-breaking spaces (\xa0 or &nbsp;) and trim
                    return t.replace('\xa0', '').strip()
                
                faculty = get_clean_text(tds[0])
                partner_univ = get_clean_text(tds[1])
                if not partner_univ:
                    print(f"Warning: Missing partner university in row with ID {row.get('id')}. Skipping this row.")
                    print(f"Row content: {[get_clean_text(td) for td in tds]}")
                    continue

                partner_uni_courses = []
                pu_code1 = get_clean_text(tds[2])
                pu_title1 = get_clean_text(tds[3])
                pu_units1 = get_clean_text(tds[4])
                if pu_code1 and pu_title1 and pu_units1:
                    partner_uni_courses.append(
                        (pu_code1, pu_title1, pu_units1)
                        )

                pu_code2 = get_clean_text(tds[5])
                pu_title2 = get_clean_text(tds[6])
                pu_units2 = get_clean_text(tds[7])
                if pu_code2 and pu_title2 and pu_units2:
                    partner_uni_courses.append(
                        (pu_code2, pu_title2, pu_units2)
                    )

                if not partner_uni_courses:
                    print(f"Warning: No valid partner university courses found in row with ID {row.get('id')}. Skipping this row.")
                    print(f"Row content: {[get_clean_text(td) for td in tds]}")
                    continue

                nus_courses = []

                # Extract NUS course details from columns 8-13
                # more lenient since course title/units can be recovered
                nus_code1 = get_clean_text(tds[8])
                nus_title1 = get_clean_text(tds[9])
                nus_units1 = get_clean_text(tds[10])
                if nus_code1:
                    nus_courses.append(
                        (nus_code1, nus_title1, nus_units1)
                    )

                nus_code2 = get_clean_text(tds[11])
                nus_title2 = get_clean_text(tds[12])
                nus_units2 = get_clean_text(tds[13])
                if nus_code2:
                    nus_courses.append(
                        (nus_code2, nus_title2, nus_units2)
                    )

                if not nus_courses:
                    print(f"Warning: No valid NUS courses found in row with ID {row.get('id')}. Skipping this row.")
                    print(f"Row content: {[get_clean_text(td) for td in tds]}")
                    continue
                
                # Checkbox check: look for an input checkbox in Col 14
                checkbox = tds[14].find('input', type='checkbox')
                pre_approved = False
                if checkbox:
                    pre_approved = checkbox.has_attr('checked')
                
                # write the first course mapping entry to CSV
                cross_product = itertools.product(partner_uni_courses, nus_courses)
                for pu_course, nus_course in cross_product:
                    writer.writerow([
                        faculty,
                        partner_univ,
                        pu_course[0],
                        pu_course[1],
                        pu_course[2],
                        nus_course[0],
                        nus_course[1],
                        nus_course[2],
                        pre_approved
                    ])
                    written_count += 1
                
        print(f"Successfully scraped and wrote {written_count} course mapping entries to {csv_path}.")
    except Exception as e:
        print(f"Error writing CSV file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
